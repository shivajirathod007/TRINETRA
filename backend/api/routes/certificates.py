from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from db.session import get_db
from db.repository import CertificateRepository, ScanRepository
from db.models import PQCCertificate

router = APIRouter()

@router.get("/")
async def list_certificates(
    scan_id: Optional[str] = None,
    domain: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all PQC certificates, optionally filtered by scan or domain."""
    repo = CertificateRepository(db)
    
    if scan_id:
        try:
            sid = uuid.UUID(scan_id)
            certs = await repo.get_certificates_for_scan(sid)
            return certs
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid scan_id format")
            
    if domain:
        # Find the latest scan for this domain first
        scan_repo = ScanRepository(db)
        scans = await scan_repo.get_scans_by_domain(domain, limit=1)
        if not scans:
            return []
        certs = await repo.get_certificates_for_scan(scans[0].id)
        return certs

    # Default: return recent certificates (could add a generic list method to repo)
    # For now, let's assume we need a specific context.
    return []

@router.get("/scan/{scan_id}")
async def get_certificates_by_scan(
    scan_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve all certificates for a specific scan ID."""
    repo = CertificateRepository(db)
    try:
        sid = uuid.UUID(scan_id)
        certs = await repo.get_certificates_for_scan(sid)
        return certs
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan_id format")

@router.get("/{cert_id}")
async def get_certificate(
    cert_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get details for a specific PQC certificate."""
    repo = CertificateRepository(db)
    try:
        # Check if it's a UUID or the human-readable certificate_id
        if "-" in cert_id and len(cert_id) == 36:
            uid = uuid.UUID(cert_id)
            cert = await repo.get_certificate(uid)
        else:
            # Fallback to searching by the 'certificate_id' string (e.g. TRN-2026-...)
            # We would need a repo method for this.
            from sqlalchemy import select
            result = await db.execute(
                select(PQCCertificate).where(PQCCertificate.certificate_id == cert_id)
            )
            cert = result.scalar_one_or_none()
            
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found")
        return cert
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid certificate ID format")
