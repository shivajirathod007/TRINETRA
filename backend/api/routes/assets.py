from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from db.session import get_db
from db.repository import ScanRepository
from db.models import ScanJob, ScannedAsset

router = APIRouter()


async def _latest_scan_id_for_domain(db: AsyncSession, domain: str):
    result = await db.execute(
        select(ScanJob.id)
        .where(ScanJob.domain == domain)
        .order_by(ScanJob.created_at.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return str(row) if row else None


@router.get("/")
async def list_assets(
    scan_id: Optional[str] = None,
    domain: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List scanned assets, optionally filtered by scan_id or domain."""
    repo = ScanRepository(db)
    if scan_id:
        try:
            uid = uuid.UUID(scan_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid scan_id")
        assets = await repo.get_assets_for_scan(uid)
    elif domain:
        sid = await _latest_scan_id_for_domain(db, domain)
        if not sid:
            return []
        assets = await repo.get_assets_for_scan(uuid.UUID(sid))
    else:
        return []
    assets = assets[:limit]
    return [
        {
            "id": str(a.id),
            "url": a.asset_url,
            "domain": domain,
            "type": a.asset_type,
            "risk_level": a.risk_level or "UNKNOWN",
            "score": round(a.quantum_exposure_score, 0) if a.quantum_exposure_score is not None else 0,
            "discovery": "Shadow" if a.is_shadow_asset else "Known",
            "scan_id": str(a.scan_job_id),
        }
        for a in assets
    ]


@router.get("/{asset_id}")
async def get_asset_detail(asset_id: str, db: AsyncSession = Depends(get_db)):
    """Get full cryptographic detail for a specific asset."""
    try:
        uid = uuid.UUID(asset_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid asset_id")
    repo = ScanRepository(db)
    a = await repo.get_asset(uid)
    if not a:
        raise HTTPException(status_code=404, detail="Asset not found")
    cert_expiry = a.cert_expiry.isoformat() if a.cert_expiry else None
    return {
        "id": str(a.id),
        "url": a.asset_url,
        "domain": a.scan_job.domain if a.scan_job else None,
        "type": a.asset_type,
        "risk_level": a.risk_level or "UNKNOWN",
        "score": round(a.quantum_exposure_score, 0) if a.quantum_exposure_score is not None else 0,
        "discovery": "Shadow" if a.is_shadow_asset else "Known",
        "scan_id": str(a.scan_job_id),
        "tls_version": a.tls_version_active,
        "cipher_suite": a.cipher_suite_active,
        "key_exchange": a.key_exchange,
        "cert_algorithm": a.cert_algorithm,
        "cert_expiry": cert_expiry,
        "cert_issuer": a.cert_issuer,
        "cert_subject": a.cert_subject,
        "hndl_window_days": None,
        "pqc_status": a.quantum_safe_status or "UNKNOWN",
        "vulnerabilities": a.vulnerabilities or [],
        "recommendations": [],
    }
