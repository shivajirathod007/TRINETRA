from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from db.session import get_db
from db.repository import ScanRepository
from db.models import ScanJob, ScannedAsset
from schemas.asset import SensitivityTierOverride, SensitivityTierOverrideResponse
from api.dependencies import get_current_user

router = APIRouter()


async def _latest_scan_id_for_domain(db: AsyncSession, domain: str):
    # Normalize domain
    domain = domain.lower().strip()
    for prefix in ("https://", "http://"):
        if domain.startswith(prefix):
            domain = domain[len(prefix):]
    domain = domain.rstrip("/").removeprefix("www.")

    # Try exact match and www variant
    for candidate in [domain, f"www.{domain}"]:
        result = await db.execute(
            select(ScanJob.id)
            .where(ScanJob.domain == candidate)
            .order_by(ScanJob.created_at.desc())
            .limit(1)
        )
        row = result.scalar_one_or_none()
        if row:
            return str(row)
    return None


@router.get("/")
async def list_assets(
    scan_id: Optional[str] = None,
    domain: Optional[str] = None,
    limit: int = 500,
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
            "fqdn": a.fqdn,
            "domain": domain or a.fqdn,
            "type": a.asset_type,
            "risk_level": a.risk_level or "UNKNOWN",
            "score": round(a.quantum_exposure_score, 0) if a.quantum_exposure_score is not None else 0,
            "discovery": "Shadow" if a.is_shadow_asset else "Known",
            "scan_id": str(a.scan_job_id),
            "ip_address": a.ip_address,
            "port": a.port,
            "tls_version": a.tls_version_active,
            "cert_issuer": a.cert_issuer,
            "cert_subject": a.cert_subject,
            "cert_sha256": a.cert_sha256,
            "cert_expiry": a.cert_expiry.strftime("%d %b %Y") if a.cert_expiry else None,
            "scan_timestamp": a.scan_timestamp.strftime("%d %b %Y") if a.scan_timestamp else "—",
            # PQC status — used by Posture of PQC page
            "quantum_safe_status": a.quantum_safe_status or "UNKNOWN",
            # Sensitivity tier fields
            "data_sensitivity_tier": a.data_sensitivity_tier or "static",
            "data_sensitivity_tier_source": a.data_sensitivity_tier_source or "auto_detected",
            # Score breakdown for tooltip
            "score_breakdown": a.score_breakdown,
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

    # Extract sensitivity tier impact from score_breakdown if available
    score_breakdown = a.score_breakdown or {}
    sensitivity_tier_impact = score_breakdown.get("sensitivity_tier_impact")
    data_shelf_life_years = score_breakdown.get("data_shelf_life_years", 0.0)

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
        # Sensitivity tier fields (Requirement 7.1, 7.2)
        "data_sensitivity_tier": a.data_sensitivity_tier or "static",
        "data_sensitivity_tier_source": a.data_sensitivity_tier_source or "auto_detected",
        "data_shelf_life_years": data_shelf_life_years,
        "sensitivity_tier_impact": sensitivity_tier_impact,
    }


@router.patch("/{asset_id}/sensitivity-tier", response_model=SensitivityTierOverrideResponse)
async def override_sensitivity_tier(
    asset_id: str,
    body: SensitivityTierOverride,
    db: AsyncSession = Depends(get_db),
):
    """
    Manually override the data sensitivity tier for an asset.
    Synchronously recomputes HNDL urgency and QARS exposure score.
    Returns updated scores in the response body.

    Requirements: 4.1–4.7
    """
    # Validate asset_id format
    try:
        uid = uuid.UUID(asset_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid asset_id format")

    repo = ScanRepository(db)
    asset = await repo.get_asset(uid)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Synchronous re-score with the new tier
    try:
        from engine.analysis.exposure_scorer import ExposureScorer
        from engine.analysis.hndl_engine import HNDLEngine
        from engine.analysis.cbom_generator import CBOMGenerator
        from engine.discovery.sensitivity_detector import SensitivityDetector
        from core.config import settings

        new_tier = body.data_sensitivity_tier

        # Resolve shelf-life for the new tier
        detector = SensitivityDetector()
        shelf_life_years = detector.get_shelf_life(new_tier)

        cert_expiry_days = asset.cert_expiry_days or 365

        scorer = ExposureScorer()
        score_result = scorer.score(
            asset_url=asset.asset_url,
            algorithm=asset.cert_algorithm or "RSA-2048",
            asset_type=asset.asset_type,
            cert_expiry_days=cert_expiry_days,
            crqc_year=settings.crqc_moderate_year,
            is_shadow_asset=asset.is_shadow_asset,
            key_exchange=asset.key_exchange,
            jwt_algorithm=asset.jwt_algorithm,
            data_sensitivity_tier=new_tier,
        )

        hndl_engine = HNDLEngine()
        hndl_result = hndl_engine.calculate(
            asset_url=asset.asset_url,
            algorithm=asset.cert_algorithm or "RSA-2048",
            cert_expiry_days=cert_expiry_days,
            data_sensitivity_tier=new_tier,
        )

        # Regenerate CBOM entry with updated tier
        cbom_gen = CBOMGenerator()

        class _Asset:
            fqdn = asset.fqdn
            ip_address = asset.ip_address
            port = asset.port
            asset_type = asset.asset_type
            asset_url = asset.asset_url
            is_shadow_asset = asset.is_shadow_asset

        new_cbom_entry = cbom_gen.generate_asset_entry(
            asset=_Asset(),
            tls_result=None,
            cert_info=None,
            api_result=None,
            ssh_result=None,
            score_result=score_result,
            hndl_result=hndl_result,
            scan_id=str(asset.scan_job_id),
            pqc_certificate_id=str(asset.pqc_certificate_id) if asset.pqc_certificate_id else None,
            ai_detections=asset.ai_detections,
            data_sensitivity_tier=new_tier,
            data_sensitivity_tier_source="manual_override",
            data_shelf_life_years=shelf_life_years,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Score recomputation failed: {str(exc)[:200]}",
        )

    # Persist all updated fields in a single DB write
    try:
        asset.data_sensitivity_tier = new_tier
        asset.data_sensitivity_tier_source = "manual_override"
        asset.sensitivity_override_reason = body.override_reason
        asset.quantum_exposure_score = score_result.score
        asset.risk_level = score_result.risk_level
        asset.hndl_deadline = hndl_result.primary_deadline
        asset.hndl_urgency = hndl_result.urgency_level
        asset.score_breakdown = {
            "algorithm_risk": score_result.breakdown.algorithm_risk_raw,
            "hndl_timeline": score_result.breakdown.hndl_timeline_raw,
            "public_exposure": score_result.breakdown.public_exposure_raw,
            "weights": score_result.breakdown.weights,
            "data_sensitivity_tier": score_result.breakdown.data_sensitivity_tier,
            "data_shelf_life_years": score_result.breakdown.data_shelf_life_years,
            "sensitivity_tier_impact": score_result.breakdown.sensitivity_tier_impact,
            "formula": "Score = (AlgRisk×0.40) + (HNDLTimeline[sensitivity-adjusted]×0.40) + (Exposure×0.20)",
        }
        asset.cbom_entry = new_cbom_entry
        await db.commit()
        await db.refresh(asset)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Database write failed: {str(exc)[:200]}",
        )

    return SensitivityTierOverrideResponse(
        asset_id=str(asset.id),
        data_sensitivity_tier=new_tier,
        data_sensitivity_tier_source="manual_override",
        quantum_exposure_score=score_result.score,
        risk_level=score_result.risk_level,
        hndl_deadline=hndl_result.primary_deadline,
        hndl_urgency=hndl_result.urgency_level,
        mosca_x=hndl_result.mosca_x,
        mosca_act_now=hndl_result.mosca_act_now,
        data_shelf_life_years=shelf_life_years,
        sensitivity_tier_impact=score_result.breakdown.sensitivity_tier_impact,
        score_breakdown=asset.score_breakdown,
    )
