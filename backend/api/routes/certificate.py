from fastapi import APIRouter, Depends
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from db.session import get_db
from db.repository import ScanRepository, CertificateRepository
from db.models import ScanJob, ScannedAsset, PQCCertificate

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


def _cert_to_response(c: PQCCertificate, asset_id: Optional[str] = None):
    return {
        "id": c.certificate_id,
        "asset_id": asset_id or "",
        "asset_url": c.asset_url,
        "pqc_status": c.status,
        "risk_level": c.status,
        "key_exchange": c.key_exchange,
        "cert_algorithm": c.signature_algorithm,
        "score": round(c.quantum_exposure_score, 0) if c.quantum_exposure_score is not None else 0,
        "valid_until": c.valid_until,
        "issued_at": c.issued_date,
    }


@router.get("/")
async def list_certificates(
    domain: Optional[str] = None,
    scan_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List PQC certificates for a domain or scan."""
    cert_repo = CertificateRepository(db)
    scan_repo = ScanRepository(db)
    if scan_id:
        try:
            uid = uuid.UUID(scan_id)
        except ValueError:
            return []
        certs = await cert_repo.get_certificates_for_scan(uid)
    elif domain:
        sid = await _latest_scan_id_for_domain(db, domain)
        if not sid:
            return []
        certs = await cert_repo.get_certificates_for_scan(uuid.UUID(sid))
    else:
        return []
    if not certs:
        return []
    scan_uid = certs[0].scan_job_id
    assets = await scan_repo.get_assets_for_scan(scan_uid)
    cert_id_to_asset = {str(a.pqc_certificate_id): str(a.id) for a in assets if a.pqc_certificate_id}
    out = []
    for c in certs:
        asset_id = cert_id_to_asset.get(str(c.id), "")
        out.append(_cert_to_response(c, asset_id))
    return out


@router.get("/scan/{scan_id}")
async def get_certs_by_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    """List all certificates generated for a scan."""
    return await list_certificates(scan_id=scan_id, db=db)


@router.get("/{asset_id}")
async def get_certificate(asset_id: str, db: AsyncSession = Depends(get_db)):
    """Get the PQC readiness certificate for a specific asset (by asset UUID)."""
    try:
        uid = uuid.UUID(asset_id)
    except ValueError:
        return {
            "id": asset_id,
            "asset_url": "",
            "asset_id": asset_id,
            "pqc_status": "UNKNOWN",
            "key_exchange": None,
            "cert_algorithm": None,
            "score": 0,
            "valid_until": None,
            "issued_at": None,
        }
    scan_repo = ScanRepository(db)
    asset = await scan_repo.get_asset(uid)
    if not asset or not asset.pqc_certificate_id:
        return {
            "id": asset_id,
            "asset_url": asset.asset_url if asset else "",
            "asset_id": asset_id,
            "pqc_status": "UNKNOWN",
            "key_exchange": None,
            "cert_algorithm": None,
            "score": 0,
            "valid_until": None,
            "issued_at": None,
        }
    cert_repo = CertificateRepository(db)
    cert = await cert_repo.get_certificate(asset.pqc_certificate_id)
    if not cert:
        return {"id": asset_id, "asset_url": asset.asset_url, "asset_id": asset_id, "pqc_status": "UNKNOWN", "score": 0}
    return _cert_to_response(cert, asset_id=str(asset.id))
