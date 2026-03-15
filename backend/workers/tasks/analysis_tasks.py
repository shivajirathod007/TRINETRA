"""
TRINETRA — Analysis Aggregation Task
Called after all per-asset scans complete (Celery chord callback).
Computes organization-level score and finalizes the scan job.
"""

import uuid

from workers.celery_app import celery_app
from core.logging import get_logger

log = get_logger(__name__)


@celery_app.task(name="analysis_tasks.aggregate_scan_results", bind=True)
def aggregate_scan_results(self, asset_results: list[dict], scan_id: str, domain: str) -> dict:
    """
    Chord callback — receives results from all per-asset scan tasks.
    Computes organization score and marks scan as COMPLETED.

    Args:
        asset_results: List of dicts returned by scan_single_asset tasks
        scan_id:       Parent scan job UUID string
        domain:        Scanned domain

    Returns:
        Final scan summary dict
    """
    import asyncio
    from db.session import AsyncSessionLocal
    from db.repository import ScanRepository
    from engine.analysis.exposure_scorer import ExposureScorer

    log.info(
        "aggregation_started",
        scan_id=scan_id,
        total_assets=len(asset_results),
    )

    # Filter out failed tasks
    successful = [r for r in asset_results if r.get("status") != "failed"]
    failed_count = len(asset_results) - len(successful)

    # Extract scores for organization-level calculation
    scores = [
        r.get("quantum_exposure_score", 0.0)
        for r in successful
        if r.get("quantum_exposure_score") is not None
    ]

    scorer = ExposureScorer()
    org_score = scorer.score_organization(scores) if scores else 0.0

    # Count risk tiers
    risk_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "SAFE": 0}
    shadow_count = 0

    for r in successful:
        tier = r.get("risk_level", "UNKNOWN")
        if tier in risk_counts:
            risk_counts[tier] += 1
        if r.get("is_shadow_asset", False):
            shadow_count += 1

    async def _finalize():
        async with AsyncSessionLocal() as db:
            repo = ScanRepository(db)
            await repo.finalize_scan(
                scan_id=uuid.UUID(scan_id),
                organization_score=org_score,
                risk_counts=risk_counts,
                shadow_assets_found=shadow_count,
            )
            await db.commit()

    asyncio.run(_finalize())

    summary = {
        "scan_id": scan_id,
        "domain": domain,
        "status": "COMPLETED",
        "organization_score": org_score,
        "assets_scanned": len(successful),
        "assets_failed": failed_count,
        "risk_distribution": risk_counts,
        "shadow_assets_found": shadow_count,
    }

    log.info("scan_finalized", **summary)
    return summary
