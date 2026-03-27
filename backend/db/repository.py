"""
TRINETRA — Repository Layer
All database access goes through this class.
Routes and engine code never write raw SQL or ORM queries directly.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.models import PQCCertificate, ScannedAsset, ScanJob
from core.logging import get_logger

log = get_logger(__name__)


class ScanRepository:
    """Handles all ScanJob and ScannedAsset persistence."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ─── ScanJob ──────────────────────────────────────────────────────────────

    async def create_scan(self, domain: str, crqc_year: int = 2032) -> ScanJob:
        scan = ScanJob(
            domain=domain,
            status="PENDING",
            crqc_year_used=crqc_year,
        )
        self.db.add(scan)
        await self.db.flush()  # Get the ID without committing
        log.info("scan_created", scan_id=str(scan.id), domain=domain)
        return scan

    async def get_scan(self, scan_id: uuid.UUID) -> Optional[ScanJob]:
        result = await self.db.execute(
            select(ScanJob)
            .where(ScanJob.id == scan_id)
            .options(selectinload(ScanJob.assets))
        )
        return result.scalar_one_or_none()

    async def get_scans_by_domain(self, domain: str, limit: int = 10) -> list[ScanJob]:
        result = await self.db.execute(
            select(ScanJob)
            .where(ScanJob.domain == domain)
            .order_by(ScanJob.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_recent_scans(self, limit: int = 20, domain: Optional[str] = None) -> list[ScanJob]:
        q = select(ScanJob).order_by(ScanJob.created_at.desc()).limit(limit)
        if domain:
            q = q.where(ScanJob.domain == domain)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def update_scan_status(
        self,
        scan_id: uuid.UUID,
        status: str,
        current_stage: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> None:
        values: dict = {"status": status}
        if current_stage:
            values["current_stage"] = current_stage
        if error_message:
            values["error_message"] = error_message
        if status == "RUNNING":
            values["started_at"] = datetime.now(timezone.utc)
        if status in ("COMPLETED", "FAILED"):
            values["completed_at"] = datetime.now(timezone.utc)

        await self.db.execute(
            update(ScanJob).where(ScanJob.id == scan_id).values(**values)
        )
        log.info("scan_status_updated", scan_id=str(scan_id), status=status)

    async def update_scan_progress(
        self,
        scan_id: uuid.UUID,
        assets_discovered: Optional[int] = None,
        assets_scanned: Optional[int] = None,
        current_stage: Optional[str] = None,
    ) -> None:
        values: dict = {}
        if assets_discovered is not None:
            values["assets_discovered"] = assets_discovered
        if assets_scanned is not None:
            values["assets_scanned"] = assets_scanned
        if current_stage:
            values["current_stage"] = current_stage
        if values:
            await self.db.execute(
                update(ScanJob).where(ScanJob.id == scan_id).values(**values)
            )

    async def cancel_scan(self, scan_id: uuid.UUID, reason: str = "Cancelled by user") -> None:
        """Force a PENDING/RUNNING scan into FAILED state."""
        await self.db.execute(
            update(ScanJob)
            .where(ScanJob.id == scan_id)
            .values(
                status="FAILED",
                completed_at=datetime.now(timezone.utc),
                error_message=reason,
            )
        )
        log.info("scan_cancelled", scan_id=str(scan_id), reason=reason)

    async def finalize_scan(
        self,
        scan_id: uuid.UUID,
        organization_score: float,
        risk_counts: dict,
        shadow_assets_found: int,
    ) -> None:
        await self.db.execute(
            update(ScanJob)
            .where(ScanJob.id == scan_id)
            .values(
                status="COMPLETED",
                organization_score=organization_score,
                critical_count=risk_counts.get("CRITICAL", 0),
                high_count=risk_counts.get("HIGH", 0),
                medium_count=risk_counts.get("MEDIUM", 0),
                low_count=risk_counts.get("LOW", 0),
                safe_count=risk_counts.get("SAFE", 0),
                shadow_assets_found=shadow_assets_found,
                completed_at=datetime.now(timezone.utc),
                current_stage="complete",
            )
        )
        log.info("scan_finalized", scan_id=str(scan_id), org_score=organization_score)

    # ─── ScannedAsset ─────────────────────────────────────────────────────────

    async def create_asset(
        self,
        scan_job_id: uuid.UUID,
        fqdn: str,
        asset_url: str,
        asset_type: str,
        port: int = 443,
        ip_address: Optional[str] = None,
        is_shadow_asset: bool = False,
        discovery_method: str = "ct_log_mining",
    ) -> ScannedAsset:
        asset = ScannedAsset(
            scan_job_id=scan_job_id,
            fqdn=fqdn,
            asset_url=asset_url,
            asset_type=asset_type,
            port=port,
            ip_address=ip_address,
            is_shadow_asset=is_shadow_asset,
            discovery_method=discovery_method,
            scan_status="PENDING",
        )
        self.db.add(asset)
        await self.db.flush()
        return asset

    async def get_asset(self, asset_id: uuid.UUID) -> Optional[ScannedAsset]:
        result = await self.db.execute(
            select(ScannedAsset)
            .where(ScannedAsset.id == asset_id)
            .options(selectinload(ScannedAsset.scan_job))
        )
        return result.scalar_one_or_none()

    async def get_assets_for_scan(self, scan_id: uuid.UUID) -> list[ScannedAsset]:
        result = await self.db.execute(
            select(ScannedAsset)
            .where(ScannedAsset.scan_job_id == scan_id)
            .order_by(ScannedAsset.quantum_exposure_score.desc().nullslast())
        )
        return list(result.scalars().all())

    async def update_asset_scan_result(
        self,
        asset_id: uuid.UUID,
        scan_data: dict,
    ) -> None:
        """
        Bulk-update all scan result fields for an asset.
        scan_data is a dict matching ScannedAsset column names.
        """
        scan_data["scan_status"] = "COMPLETED"
        await self.db.execute(
            update(ScannedAsset)
            .where(ScannedAsset.id == asset_id)
            .values(**scan_data)
        )

    async def mark_asset_failed(
        self,
        asset_id: uuid.UUID,
        error: str,
        status: str = "FAILED",
    ) -> None:
        await self.db.execute(
            update(ScannedAsset)
            .where(ScannedAsset.id == asset_id)
            .values(scan_status=status, scan_error=error[:500])
        )

    async def get_dashboard_stats(self, domain: str) -> dict:
        """Returns aggregated risk statistics for a domain's latest scan."""
        # Try multiple domain variants to handle https:// prefix, www, trailing slash
        domain_clean = domain.lower().strip()
        for prefix in ("https://", "http://"):
            if domain_clean.startswith(prefix):
                domain_clean = domain_clean[len(prefix):]
        domain_clean = domain_clean.rstrip("/").removeprefix("www.")

        # Try exact match first, then with/without www
        candidates = list({domain_clean, f"www.{domain_clean}", domain})

        latest_scan = None
        for candidate in candidates:
            result = await self.db.execute(
                select(ScanJob)
                .where(ScanJob.domain == candidate, ScanJob.status == "COMPLETED")
                .order_by(ScanJob.completed_at.desc())
                .limit(1)
            )
            scan = result.scalar_one_or_none()
            if scan:
                latest_scan = scan
                break

        if not latest_scan:
            return {}

        return {
            "scan_id": str(latest_scan.id),
            "domain": latest_scan.domain,
            "organization_score": latest_scan.organization_score,
            "assets_scanned": latest_scan.assets_scanned,
            "critical_count": latest_scan.critical_count,
            "high_count": latest_scan.high_count,
            "medium_count": latest_scan.medium_count,
            "low_count": latest_scan.low_count,
            "safe_count": latest_scan.safe_count,
            "shadow_assets_found": latest_scan.shadow_assets_found,
            "completed_at": latest_scan.completed_at.isoformat() if latest_scan.completed_at else None,
        }


class CertificateRepository:
    """Handles all PQCCertificate persistence."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_certificate(self, cert_data: dict) -> PQCCertificate:
        cert = PQCCertificate(**cert_data)
        self.db.add(cert)
        await self.db.flush()
        return cert

    async def get_certificate(self, cert_id: uuid.UUID) -> Optional[PQCCertificate]:
        result = await self.db.execute(
            select(PQCCertificate).where(PQCCertificate.id == cert_id)
        )
        return result.scalar_one_or_none()

    async def get_certificates_for_scan(self, scan_id: uuid.UUID) -> list[PQCCertificate]:
        result = await self.db.execute(
            select(PQCCertificate).where(PQCCertificate.scan_job_id == scan_id)
        )
        return list(result.scalars().all())
