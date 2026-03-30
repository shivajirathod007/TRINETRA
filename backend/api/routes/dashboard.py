from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid

from db.session import get_db
from db.repository import ScanRepository
from db.models import ScanJob, ScannedAsset

router = APIRouter()

RISK_COLORS = {
    "CRITICAL": "#EF4444",
    "HIGH": "#F97316",
    "MEDIUM": "#EAB308",
    "LOW": "#3B82F6",
    "SAFE": "#22C55E",
    "PQC READY": "#3B82F6",
    "QUANTUM SAFE": "#22C55E",
}


def _asset_to_response(a):
    return {
        "id": str(a.id),
        "url": a.asset_url,
        "type": a.asset_type,
        "risk_level": a.risk_level or "UNKNOWN",
        "score": round(a.quantum_exposure_score, 0) if a.quantum_exposure_score is not None else 0,
        "discovery": "Shadow" if a.is_shadow_asset else "Known",
    }


@router.get("/aggregate")
async def get_dashboard_aggregate(db: AsyncSession = Depends(get_db)):
    """
    Returns aggregate stats across ALL completed scans.
    Used for the 'All Scans' view in the dashboard.
    """
    # Sum risk counts across all completed scans
    result = await db.execute(
        select(
            func.count(ScanJob.id).label("total_scans"),
            func.sum(ScanJob.assets_scanned).label("total_assets"),
            func.sum(ScanJob.critical_count).label("critical_count"),
            func.sum(ScanJob.high_count).label("high_count"),
            func.sum(ScanJob.medium_count).label("medium_count"),
            func.sum(ScanJob.low_count).label("low_count"),
            func.sum(ScanJob.safe_count).label("safe_count"),
            func.sum(ScanJob.shadow_assets_found).label("shadow_count"),
            func.avg(ScanJob.organization_score).label("avg_score"),
        )
        .where(ScanJob.status == "COMPLETED")
    )
    row = result.one_or_none()

    if not row or not row.total_scans:
        return {
            "domain": "ALL SCANS",
            "total_scans": 0,
            "exposure_score": 0,
            "total_assets": 0,
            "critical_count": 0,
            "high_count": 0,
            "medium_count": 0,
            "pqc_ready": 0,
            "safe": 0,
            "shadow_count": 0,
            "risk_distribution": [],
            "algorithm_breakdown": [],
            "ip_distribution": [{"name": "IPv4", "value": 100, "color": "#3B82F6"}],
            "scans_breakdown": [],
        }

    # Per-scan breakdown for the trend chart
    scans_result = await db.execute(
        select(ScanJob)
        .where(ScanJob.status == "COMPLETED")
        .order_by(ScanJob.completed_at.desc())
        .limit(20)
    )
    scans = list(scans_result.scalars().all())

    scans_breakdown = [
        {
            "scan_id": str(s.id),
            "domain": s.domain,
            "score": round(s.organization_score or 0, 0),
            "assets": s.assets_scanned or 0,
            "critical": s.critical_count or 0,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        }
        for s in scans
    ]

    # Algorithm breakdown across all scans
    algo_result = await db.execute(
        select(ScannedAsset.cert_algorithm, func.count(ScannedAsset.id).label("count"))
        .join(ScanJob, ScannedAsset.scan_job_id == ScanJob.id)
        .where(ScanJob.status == "COMPLETED", ScannedAsset.cert_algorithm.isnot(None))
        .group_by(ScannedAsset.cert_algorithm)
        .order_by(func.count(ScannedAsset.id).desc())
        .limit(10)
    )
    algorithm_breakdown = [
        {"name": r.cert_algorithm, "count": r.count}
        for r in algo_result.all()
    ]

    risk_distribution = [
        {"name": "CRITICAL", "value": int(row.critical_count or 0), "color": RISK_COLORS["CRITICAL"]},
        {"name": "HIGH",     "value": int(row.high_count or 0),     "color": RISK_COLORS["HIGH"]},
        {"name": "MEDIUM",   "value": int(row.medium_count or 0),   "color": RISK_COLORS["MEDIUM"]},
        {"name": "LOW",      "value": int(row.low_count or 0),      "color": RISK_COLORS["LOW"]},
        {"name": "SAFE",     "value": int(row.safe_count or 0),     "color": RISK_COLORS["SAFE"]},
    ]
    risk_distribution = [r for r in risk_distribution if r["value"] > 0]

    return {
        "domain": "ALL SCANS",
        "total_scans": int(row.total_scans or 0),
        "exposure_score": round(float(row.avg_score or 0), 0),
        "total_assets": int(row.total_assets or 0),
        "critical_count": int(row.critical_count or 0),
        "high_count": int(row.high_count or 0),
        "medium_count": int(row.medium_count or 0),
        "pqc_ready": 0,
        "safe": int(row.safe_count or 0),
        "shadow_count": int(row.shadow_count or 0),
        "risk_distribution": risk_distribution,
        "algorithm_breakdown": algorithm_breakdown,
        "ip_distribution": [{"name": "IPv4", "value": 100, "color": "#3B82F6"}],
        "scans_breakdown": scans_breakdown,
    }


@router.get("/")
async def get_dashboard_global(db: AsyncSession = Depends(get_db)):
    """Return empty dashboard when no domain (e.g. no scan yet)."""
    return {
        "domain": "",
        "exposure_score": 0,
        "total_assets": 0,
        "critical_count": 0,
        "high_count": 0,
        "medium_count": 0,
        "pqc_ready": 0,
        "safe": 0,
        "shadow_count": 0,
        "live_sync": True,
        "risk_distribution": [],
        "algorithm_breakdown": [],
        "assets": [],
    }


@router.get("/{domain:path}")
async def get_dashboard_summary(domain: str, db: AsyncSession = Depends(get_db)):
    """Return aggregate cryptographic exposure metrics for a domain."""
    # Normalize domain — strip protocol, trailing slash, www prefix
    domain = domain.lower().strip()
    for prefix in ("https://", "http://"):
        if domain.startswith(prefix):
            domain = domain[len(prefix):]
    domain = domain.rstrip("/").removeprefix("www.")
    repo = ScanRepository(db)
    stats = await repo.get_dashboard_stats(domain)
    if not stats:
        return {
            "domain": domain,
            "exposure_score": 0,
            "total_assets": 0,
            "critical_count": 0,
            "high_count": 0,
            "medium_count": 0,
            "pqc_ready": 0,
            "safe": 0,
            "shadow_count": 0,
            "live_sync": True,
            "risk_distribution": [],
            "algorithm_breakdown": [],
            "assets": [],
        }
    total = stats.get("assets_scanned") or 0
    risk_distribution = [
        {"name": "CRITICAL", "value": stats.get("critical_count") or 0, "color": RISK_COLORS["CRITICAL"]},
        {"name": "HIGH", "value": stats.get("high_count") or 0, "color": RISK_COLORS["HIGH"]},
        {"name": "MEDIUM", "value": stats.get("medium_count") or 0, "color": RISK_COLORS["MEDIUM"]},
        {"name": "LOW", "value": stats.get("low_count") or 0, "color": RISK_COLORS["LOW"]},
        {"name": "SAFE", "value": stats.get("safe_count") or 0, "color": RISK_COLORS["SAFE"]},
    ]
    risk_distribution = [r for r in risk_distribution if r["value"] > 0]
    assets = await repo.get_assets_for_scan(uuid.UUID(stats["scan_id"]))
    algo_counts = {}
    for a in assets:
        algo = a.cert_algorithm or "Unknown"
        algo_counts[algo] = algo_counts.get(algo, 0) + 1
    algorithm_breakdown = [{"name": k, "count": v} for k, v in sorted(algo_counts.items(), key=lambda x: -x[1])]
    ipv4_count = sum(1 for a in assets if a.ip_address and "." in a.ip_address)
    ipv6_count = sum(1 for a in assets if a.ip_address and ":" in a.ip_address)
    ip_distribution = []
    if ipv4_count > 0:
        ip_distribution.append({"name": "IPv4", "value": ipv4_count, "color": "#3B82F6"})
    if ipv6_count > 0:
        ip_distribution.append({"name": "IPv6", "value": ipv6_count, "color": "#0EA5E9"})
    if not ip_distribution:
        ip_distribution = [{"name": "IPv4", "value": 100, "color": "#3B82F6"}]

    geographic_distribution = [
        {"country": "USA", "top": "30%", "left": "20%", "color": "bg-status-critical", "pulse": True},
        {"country": "Germany", "top": "25%", "right": "40%", "color": "bg-status-safe", "pulse": False},
        {"country": "India", "top": "45%", "right": "25%", "color": "bg-primary-indigo", "pulse": False},
        {"country": "Singapore", "top": "50%", "right": "15%", "color": "bg-status-high", "pulse": False},
    ]

    return {
        "domain": stats["domain"],
        "exposure_score": round(stats.get("organization_score") or 0, 0),
        "total_assets": total,
        "critical_count": stats.get("critical_count") or 0,
        "high_count": stats.get("high_count") or 0,
        "medium_count": stats.get("medium_count") or 0,
        "pqc_ready": 0,
        "safe": stats.get("safe_count") or 0,
        "shadow_count": stats.get("shadow_assets_found") or 0,
        "live_sync": True,
        "risk_distribution": risk_distribution,
        "algorithm_breakdown": algorithm_breakdown,
        "ip_distribution": ip_distribution,
        "geographic_distribution": geographic_distribution,
        "assets": [_asset_to_response(a) for a in assets],
    }
