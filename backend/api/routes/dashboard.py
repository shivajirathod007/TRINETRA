from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from db.session import get_db
from db.repository import ScanRepository

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


@router.get("/{domain}")
async def get_dashboard_summary(domain: str, db: AsyncSession = Depends(get_db)):
    """Return aggregate cryptographic exposure metrics for a domain."""
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
