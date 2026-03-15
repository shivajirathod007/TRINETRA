from fastapi import APIRouter, Depends
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from collections import Counter
from datetime import datetime, timezone

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
async def list_cbom(
    scan_id: Optional[str] = None,
    domain: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Return CBOM summary for a scan or domain (latest scan)."""
    if not scan_id and not domain:
        return _empty_cbom(domain or "", scan_id or "")
    repo = ScanRepository(db)
    sid = scan_id
    if not sid and domain:
        sid = await _latest_scan_id_for_domain(db, domain)
    if not sid:
        return _empty_cbom(domain or "", scan_id or "")
    try:
        uid = uuid.UUID(sid)
    except ValueError:
        return _empty_cbom(domain or "", scan_id or "")
    assets = await repo.get_assets_for_scan(uid)
    components = []
    algo_counter = Counter()
    tls_counter = Counter()
    issuer_counter = Counter()
    for a in assets:
        if a.cbom_entry and isinstance(a.cbom_entry, dict):
            comp = a.cbom_entry.get("component") or a.cbom_entry
            url = comp.get("url") or comp.get("name") or a.asset_url
            components.append({
                "url": url,
                "name": comp.get("name", url),
                "tls": a.tls_version_active or comp.get("tls", "—"),
                "cipher": a.cipher_suite_active or comp.get("cipher", "—"),
                "kx": a.key_exchange or comp.get("key_exchange", "—"),
                "key_exchange": a.key_exchange,
                "cert": a.cert_algorithm or comp.get("cert_algorithm", "—"),
                "cert_algorithm": a.cert_algorithm,
                "expiry": a.cert_expiry.isoformat()[:10] if a.cert_expiry else (comp.get("cert_expiry") or "—"),
                "cert_expiry": a.cert_expiry.isoformat()[:10] if a.cert_expiry else None,
                "issuer": a.cert_issuer or comp.get("cert_issuer", "—"),
                "cert_issuer": a.cert_issuer,
                "status": a.risk_level or comp.get("status", "UNKNOWN"),
                "risk_level": a.risk_level,
            })
        else:
            components.append({
                "url": a.asset_url,
                "name": a.asset_url,
                "tls": a.tls_version_active or "—",
                "cipher": a.cipher_suite_active or "—",
                "kx": a.key_exchange or "—",
                "key_exchange": a.key_exchange,
                "cert": a.cert_algorithm or "—",
                "cert_algorithm": a.cert_algorithm,
                "expiry": a.cert_expiry.isoformat()[:10] if a.cert_expiry else "—",
                "cert_expiry": a.cert_expiry.isoformat()[:10] if a.cert_expiry else None,
                "issuer": a.cert_issuer or "—",
                "cert_issuer": a.cert_issuer,
                "status": a.risk_level or "UNKNOWN",
                "risk_level": a.risk_level,
            })
        if a.cert_algorithm:
            algo_counter[a.cert_algorithm] += 1
        if a.tls_version_active:
            tls_counter[a.tls_version_active] += 1
        if a.cert_issuer:
            issuer_counter[a.cert_issuer] += 1
    colors = ["#6366F1", "#22C55E", "#F97316", "#EAB308", "#EF4444"]
    algorithm_distribution = [{"name": k, "count": v} for k, v in algo_counter.most_common(10)]
    tls_distribution = [{"name": k, "value": v, "color": colors[i % len(colors)]} for i, (k, v) in enumerate(tls_counter.most_common())]
    issuer_breakdown = dict(issuer_counter)
    return {
        "domain": domain or "",
        "scan_id": sid,
        "bomFormat": "CycloneDX",
        "specVersion": "1.6",
        "serialNumber": f"urn:uuid:{sid}",
        "metadata": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "component": {"type": "application", "name": domain or sid},
        },
        "components": components,
        "algorithm_distribution": algorithm_distribution,
        "tls_distribution": tls_distribution,
        "issuer_breakdown": issuer_breakdown,
    }


def _empty_cbom(domain: str, scan_id: str):
    return {
        "domain": domain,
        "scan_id": scan_id,
        "bomFormat": "CycloneDX",
        "specVersion": "1.6",
        "serialNumber": "",
        "metadata": {"timestamp": "", "component": {"type": "application", "name": domain or ""}},
        "components": [],
        "algorithm_distribution": [],
        "tls_distribution": [],
        "issuer_breakdown": {},
    }


@router.get("/{scan_id}")
async def get_cbom(scan_id: str, db: AsyncSession = Depends(get_db)):
    """Return full CBOM for a specific scan."""
    return await list_cbom(scan_id=scan_id, db=db)
