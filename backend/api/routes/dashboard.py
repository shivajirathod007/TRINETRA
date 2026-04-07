from fastapi import APIRouter, Depends
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid

from db.session import get_db
from db.repository import ScanRepository
from db.models import ScanJob, ScannedAsset
from api.dependencies import get_current_user

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
        "data_sensitivity_tier": a.data_sensitivity_tier or "static",
        "data_sensitivity_tier_source": a.data_sensitivity_tier_source,
        "cert_expiry_days": a.cert_expiry_days,
        "cert_algorithm": a.cert_algorithm,
        "ip_address": a.ip_address,
    }


@router.get("/aggregate")
async def get_dashboard_aggregate(db: AsyncSession = Depends(get_db), current_user: str = Depends(get_current_user)):
    """
    Returns aggregate stats across ALL completed scans.
    Counts are from actual ScannedAsset rows (not ScanJob counters) to avoid
    double-counting when the same domain is scanned multiple times.
    """
    # Count completed scans
    scan_count_result = await db.execute(
        select(func.count(ScanJob.id), func.avg(ScanJob.organization_score))
        .where(ScanJob.status == "COMPLETED")
    )
    scan_row = scan_count_result.one_or_none()
    total_scans = int(scan_row[0] or 0) if scan_row else 0
    avg_score = float(scan_row[1] or 0) if scan_row else 0.0

    if not total_scans:
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

    # Count assets directly from ScannedAsset joined to completed ScanJobs
    # This gives accurate counts per risk level across all scans
    risk_result = await db.execute(
        select(ScannedAsset.risk_level, func.count(ScannedAsset.id).label("cnt"))
        .join(ScanJob, ScannedAsset.scan_job_id == ScanJob.id)
        .where(ScanJob.status == "COMPLETED", ScannedAsset.risk_level.isnot(None))
        .group_by(ScannedAsset.risk_level)
    )
    risk_map = {r.risk_level: r.cnt for r in risk_result.all()}

    total_assets_result = await db.execute(
        select(func.count(ScannedAsset.id))
        .join(ScanJob, ScannedAsset.scan_job_id == ScanJob.id)
        .where(ScanJob.status == "COMPLETED")
    )
    total_assets = total_assets_result.scalar() or 0

    shadow_result = await db.execute(
        select(func.count(ScannedAsset.id))
        .join(ScanJob, ScannedAsset.scan_job_id == ScanJob.id)
        .where(ScanJob.status == "COMPLETED", ScannedAsset.is_shadow_asset == True)
    )
    shadow_count = shadow_result.scalar() or 0

    critical_count = risk_map.get("CRITICAL", 0)
    high_count     = risk_map.get("HIGH", 0)
    medium_count   = risk_map.get("MEDIUM", 0)
    low_count      = risk_map.get("LOW", 0)
    safe_count     = risk_map.get("SAFE", 0)

    # Per-scan breakdown for the trend chart (most recent 20)
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
            "high": s.high_count or 0,
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
        {"name": "CRITICAL", "value": critical_count, "color": RISK_COLORS["CRITICAL"]},
        {"name": "HIGH",     "value": high_count,     "color": RISK_COLORS["HIGH"]},
        {"name": "MEDIUM",   "value": medium_count,   "color": RISK_COLORS["MEDIUM"]},
        {"name": "LOW",      "value": low_count,      "color": RISK_COLORS["LOW"]},
        {"name": "SAFE",     "value": safe_count,     "color": RISK_COLORS["SAFE"]},
    ]
    risk_distribution = [r for r in risk_distribution if r["value"] > 0]

    return {
        "domain": "ALL SCANS",
        "total_scans": total_scans,
        "exposure_score": round(avg_score, 0),
        "total_assets": total_assets,
        "critical_count": critical_count,
        "high_count": high_count,
        "medium_count": medium_count,
        "pqc_ready": 0,
        "safe": safe_count,
        "shadow_count": shadow_count,
        "risk_distribution": risk_distribution,
        "algorithm_breakdown": algorithm_breakdown,
        "ip_distribution": [{"name": "IPv4", "value": 100, "color": "#3B82F6"}],
        "scans_breakdown": scans_breakdown,
    }


@router.get("/")
async def get_dashboard_global(db: AsyncSession = Depends(get_db), current_user: str = Depends(get_current_user)):
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
async def get_dashboard_summary(domain: str, scan_id: Optional[str] = None, db: AsyncSession = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Return aggregate cryptographic exposure metrics for a domain."""
    # Normalize domain — strip protocol, trailing slash, www prefix
    domain = domain.lower().strip()
    for prefix in ("https://", "http://"):
        if domain.startswith(prefix):
            domain = domain[len(prefix):]
    domain = domain.rstrip("/").removeprefix("www.")
    repo = ScanRepository(db)

    # If a specific scan_id is provided, use it directly instead of domain lookup
    if scan_id:
        try:
            uid = uuid.UUID(scan_id)
        except ValueError:
            uid = None
        if uid:
            result = await db.execute(select(ScanJob).where(ScanJob.id == uid))
            scan_job = result.scalar_one_or_none()
            if scan_job:
                # Count actual asset rows in DB (includes API-crawled sub-endpoints)
                count_result = await db.execute(
                    select(func.count(ScannedAsset.id))
                    .where(ScannedAsset.scan_job_id == uid)
                )
                actual_asset_count = count_result.scalar() or 0

                # Recompute risk counts from actual asset rows
                risk_result = await db.execute(
                    select(ScannedAsset.risk_level, func.count(ScannedAsset.id).label("cnt"))
                    .where(ScannedAsset.scan_job_id == uid, ScannedAsset.risk_level.isnot(None))
                    .group_by(ScannedAsset.risk_level)
                )
                risk_map = {r.risk_level: r.cnt for r in risk_result.all()}

                shadow_result = await db.execute(
                    select(func.count(ScannedAsset.id))
                    .where(ScannedAsset.scan_job_id == uid, ScannedAsset.is_shadow_asset == True)
                )
                actual_shadow = shadow_result.scalar() or scan_job.shadow_assets_found or 0

                stats = {
                    "scan_id": str(scan_job.id),
                    "domain": scan_job.domain,
                    "organization_score": scan_job.organization_score,
                    "assets_scanned": actual_asset_count,
                    "critical_count": risk_map.get("CRITICAL", scan_job.critical_count or 0),
                    "high_count": risk_map.get("HIGH", scan_job.high_count or 0),
                    "medium_count": risk_map.get("MEDIUM", scan_job.medium_count or 0),
                    "low_count": risk_map.get("LOW", scan_job.low_count or 0),
                    "safe_count": risk_map.get("SAFE", scan_job.safe_count or 0),
                    "shadow_assets_found": actual_shadow,
                }
            else:
                stats = None
        else:
            stats = None
    else:
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

    # Geographic distribution — derived from actual asset IP addresses
    # Groups assets by country using IP prefix heuristics + counts
    from collections import Counter
    country_counts: Counter = Counter()
    for a in assets:
        ip = a.ip_address or ""
        if not ip:
            continue
        # Simple heuristic: known Indian bank IP ranges and common CDN/cloud ranges
        # In production this would use a GeoIP database
        if ip.startswith(("103.", "49.", "117.", "122.", "125.", "182.", "183.", "202.", "203.", "210.", "211.", "220.", "223.")):
            country_counts["India"] += 1
        elif ip.startswith(("13.", "18.", "34.", "35.", "52.", "54.", "3.", "44.", "50.", "99.", "100.", "104.", "107.", "108.", "172.", "184.", "205.", "216.")):
            country_counts["USA"] += 1
        elif ip.startswith(("185.", "194.", "195.", "212.", "213.", "217.", "46.", "80.", "81.", "82.", "83.", "84.", "85.", "86.", "87.", "88.", "89.", "90.", "91.", "92.", "93.", "94.", "95.")):
            country_counts["Europe"] += 1
        elif ip.startswith(("1.", "14.", "27.", "36.", "42.", "58.", "59.", "60.", "61.", "101.", "106.", "111.", "112.", "113.", "114.", "115.", "116.", "118.", "119.", "120.", "121.", "123.", "124.")):
            country_counts["Asia-Pacific"] += 1
        else:
            country_counts["Other"] += 1

    # If no IPs resolved, fall back to showing India (the scanned domain's likely location)
    if not country_counts:
        country_counts["India"] = len(assets)

    geo_color_map = {
        "India": "#6366F1",
        "USA": "#EF4444",
        "Europe": "#22C55E",
        "Asia-Pacific": "#F97316",
        "Other": "#EAB308",
    }
    geographic_distribution = [
        {"country": country, "count": count, "color": geo_color_map.get(country, "#6366F1")}
        for country, count in country_counts.most_common()
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
