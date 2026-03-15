from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from db.repository import ScanRepository
from core.config import settings
from core.logging import get_logger

router = APIRouter()
log = get_logger(__name__)

# Scans stuck in RUNNING/PENDING longer than this are auto-failed
STALE_TIMEOUT_MINUTES = 30


class ScanRequest(BaseModel):
    domain: str
    crqc_scenario: Optional[str] = "moderate"


def _crqc_year(scenario: str) -> int:
    m = {"pessimistic": settings.crqc_pessimistic_year, "moderate": settings.crqc_moderate_year, "optimistic": settings.crqc_optimistic_year}
    return m.get(scenario.lower(), settings.crqc_moderate_year)


def _stage_logs(stage: Optional[str], assets_discovered: int, assets_scanned: int) -> List[str]:
    logs = ["Initializing TRINETRA scanner..."]
    if stage == "ct_mining":
        logs.append("Querying Certificate Transparency logs (crt.sh)...")
    elif stage == "dns_resolution":
        logs.append("CT log mining complete.")
        logs.append("Resolving DNS for discovered hostnames...")
    elif stage == "port_scanning":
        logs.append("DNS resolution complete.")
        logs.append("Port scanning (443, 8443, 22, 25, ...)...")
    elif stage == "scanning":
        logs.append(f"Discovered {assets_discovered} asset(s).")
        logs.append("Running TLS, certificate, API, VPN, SSH probes...")
        if assets_scanned > 0:
            logs.append(f"Scanned {assets_scanned} / {assets_discovered} assets.")
    elif stage == "complete":
        logs.append(f"Scan complete. {assets_scanned} assets analyzed.")
    if assets_discovered > 0 and assets_scanned >= assets_discovered and stage != "complete":
        logs.append("Finalizing CBOM and certificates...")
    return logs


def _is_stale(scan) -> bool:
    """Return True if a RUNNING/PENDING scan has been stuck beyond STALE_TIMEOUT_MINUTES."""
    if scan.status not in ("RUNNING", "PENDING"):
        return False
    # Use started_at for RUNNING, created_at for PENDING (never picked up)
    reference = scan.started_at or scan.created_at
    if reference is None:
        return False
    # Make both tz-aware for comparison
    now = datetime.now(timezone.utc)
    if reference.tzinfo is None:
        reference = reference.replace(tzinfo=timezone.utc)
    return (now - reference) > timedelta(minutes=STALE_TIMEOUT_MINUTES)


@router.post("/")
async def create_scan(request: ScanRequest, db: AsyncSession = Depends(get_db)):
    """Initiate a new cryptographic exposure scan. Returns 202 with scan_id for polling."""
    domain = request.domain.strip().lower()
    if not domain:
        raise HTTPException(status_code=400, detail="domain is required")
    crqc_year = _crqc_year(request.crqc_scenario or "moderate")
    repo = ScanRepository(db)
    try:
        scan = await repo.create_scan(domain, crqc_year)
        await db.commit()
    except Exception as e:
        log.exception("create_scan_db_error", domain=domain, error=str(e))
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. Ensure Postgres is running and migrations are applied.",
        ) from e
    scan_id = str(scan.id)
    queue_ok = True
    try:
        from workers.orchestrator import run_full_scan
        run_full_scan.delay(scan_id, domain)
    except Exception as e:
        queue_ok = False
        log.warning("create_scan_queue_error", scan_id=scan_id, domain=domain, error=str(e))
    return {
        "scan_id": scan_id,
        "domain": domain,
        "status": "pending",
        "progress": 0,
        "logs": ["Scan queued. Discovery will start shortly."] if queue_ok else ["Scan created. Job queue unavailable — worker may process when Redis is up."],
        "assets_found": 0,
        "shadow_assets": 0,
        "poll_url": f"/api/v1/scans/{scan_id}",
    }


@router.get("/")
async def list_scans(domain: Optional[str] = None, limit: int = 20, db: AsyncSession = Depends(get_db)):
    """List recent scans, optionally filtered by domain."""
    try:
        repo = ScanRepository(db)
        scans = await repo.get_recent_scans(limit=limit, domain=domain)

        # Auto-fail stale scans in a single pass
        stale_ids = [s.id for s in scans if _is_stale(s)]
        for stale_id in stale_ids:
            await repo.cancel_scan(stale_id, reason="Scan timed out (worker may have crashed)")
            log.warning("stale_scan_auto_failed", scan_id=str(stale_id))
        if stale_ids:
            await db.commit()
            # Re-fetch so the response reflects the updated statuses
            scans = await repo.get_recent_scans(limit=limit, domain=domain)

        return [
            {
                "scan_id": str(s.id),
                "domain": s.domain,
                "status": s.status.lower() if s.status else "unknown",
                "progress": round(100 * (s.assets_scanned or 0) / max(1, s.assets_discovered or 1)) if s.assets_discovered else 0,
                "assets_found": s.assets_discovered or 0,
                "shadow_assets": s.shadow_assets_found or 0,
                "exposure_score": round(s.organization_score, 0) if s.organization_score is not None else None,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
                "error_message": s.error_message,
            }
            for s in scans
        ]
    except Exception as e:
        log.warning("list_scans_error", error=str(e))
        return []


@router.get("/{scan_id}")
async def get_scan_status(scan_id: str, db: AsyncSession = Depends(get_db)):
    """Get current status and progress for a scan."""
    import uuid
    try:
        uid = uuid.UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan_id")
    try:
        repo = ScanRepository(db)
        scan = await repo.get_scan(uid)
    except Exception as e:
        log.exception("get_scan_status_error", scan_id=scan_id, error=str(e))
        raise HTTPException(status_code=503, detail="Database unavailable.") from e
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    # Auto-fail stale scan on individual status fetch too
    if _is_stale(scan):
        try:
            await repo.cancel_scan(uid, reason="Scan timed out (worker may have crashed)")
            await db.commit()
            scan = await repo.get_scan(uid)
        except Exception:
            pass

    total = max(1, scan.assets_discovered or 1)
    scanned = scan.assets_scanned or 0
    progress_pct = round(100 * scanned / total)
    tls_progress = progress_pct if scan.current_stage and "scanning" in (scan.current_stage or "") else (100 if scan.status == "COMPLETED" else min(progress_pct, 90))
    ai_progress = 100 if scan.status == "COMPLETED" else (progress_pct if scan.current_stage == "complete" else 0)
    logs = _stage_logs(scan.current_stage, scan.assets_discovered or 0, scanned)
    payload = {
        "scan_id": scan_id,
        "domain": scan.domain,
        "status": scan.status.lower() if scan.status else "pending",
        "progress": progress_pct,
        "tls_progress": tls_progress,
        "ai_progress": ai_progress,
        "assets_found": scan.assets_discovered or 0,
        "shadow_assets": scan.shadow_assets_found or 0,
        "logs": logs,
        "started_at": scan.started_at.isoformat() if scan.started_at else None,
        "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
        "error_message": scan.error_message,
    }
    if scan.organization_score is not None:
        payload["exposure_score"] = round(scan.organization_score, 0)
    return payload


@router.post("/{scan_id}/cancel")
async def cancel_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    """Cancel a PENDING or RUNNING scan, marking it as FAILED."""
    import uuid
    try:
        uid = uuid.UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan_id")
    try:
        repo = ScanRepository(db)
        scan = await repo.get_scan(uid)
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        if scan.status not in ("PENDING", "RUNNING"):
            raise HTTPException(status_code=409, detail=f"Scan is already {scan.status.lower()}")
        await repo.cancel_scan(uid, reason="Cancelled by user")
        await db.commit()
        return {"scan_id": scan_id, "status": "failed", "message": "Scan cancelled"}
    except HTTPException:
        raise
    except Exception as e:
        log.exception("cancel_scan_error", scan_id=scan_id, error=str(e))
        raise HTTPException(status_code=503, detail="Database error") from e
