"""
TRINETRA — Scan Orchestrator
Coordinates the full scan pipeline as a Celery task DAG.

Pipeline:
  CT Log Mining → DNS Resolution → Port Scan → Asset Classification
  → [parallel per-asset scans] → CBOM + Score + Certificate

Uses Celery chord pattern:
  - chord(parallel_tasks)(aggregate_callback)
  - Fan-out: all assets scanned simultaneously
  - Fan-in: aggregate results after all complete
"""

import asyncio
import uuid
from typing import Optional

from celery import chord, group, chain

from workers.celery_app import celery_app
from core.logging import get_logger

log = get_logger(__name__)


@celery_app.task(name="orchestrator.run_full_scan", bind=True)
def run_full_scan(self, scan_id: str, domain: str) -> dict:
    """
    Entry point for a complete domain scan.
    Called by the FastAPI route handler immediately after scan creation.

    This task itself is lightweight — it just wires up the pipeline.
    """
    from workers.tasks.analysis_tasks import aggregate_scan_results

    log.info("scan_pipeline_started", scan_id=scan_id, domain=domain)

    try:
        # ── Phase 1: Discovery (sequential — each step needs previous result) ──
        # mine_ct_logs → resolve_dns → scan_ports → classify_assets
        # classify_assets returns list of ClassifiedAsset dicts

        # Run discovery synchronously within this task
        # (discovery is fast — CT log + DNS + ports takes ~30s total)
        assets_data = _run_discovery_sync(scan_id, domain)

        if not assets_data:
            log.warning("no_assets_discovered", scan_id=scan_id, domain=domain)
            _mark_scan_failed(scan_id, "No live assets discovered")
            return {"status": "failed", "reason": "no_assets"}

        # Update scan progress
        _update_scan_stage(scan_id, "scanning", len(assets_data))

        # ── Phase 2: Per-asset scanning (parallel fan-out) ────────────────────
        from workers.tasks.scan_tasks import scan_single_asset

        # Create a Celery chord:
        # - group: scan all assets in parallel
        # - callback: aggregate after all complete
        scan_group = group(
            scan_single_asset.s(scan_id, asset_data)
            for asset_data in assets_data
        )

        result = chord(scan_group)(
            aggregate_scan_results.s(scan_id, domain)
        )

        log.info(
            "scan_pipeline_dispatched",
            scan_id=scan_id,
            domain=domain,
            asset_count=len(assets_data),
        )
        return {"status": "running", "assets": len(assets_data)}

    except Exception as e:
        log.error("scan_pipeline_error", scan_id=scan_id, error=str(e))
        _mark_scan_failed(scan_id, str(e)[:500])
        raise


def _run_discovery_sync(scan_id: str, domain: str) -> list[dict]:
    """
    Runs discovery phase synchronously within the orchestrator task.
    Returns list of asset dicts ready for per-asset scan dispatch.
    """
    import asyncio
    from engine.discovery.ct_log_miner import CTLogMiner
    from engine.discovery.dns_resolver import DNSResolver
    from engine.discovery.port_scanner import PortScanner
    from engine.discovery.asset_classifier import AssetClassifier
    from db.session import AsyncSessionLocal
    from db.repository import ScanRepository

    async def _async_discovery():
        async with AsyncSessionLocal() as db:
            repo = ScanRepository(db)
            await repo.update_scan_status(
                uuid.UUID(scan_id), "RUNNING", current_stage="ct_mining"
            )
            await db.commit()

        # Step 1: CT Log Mining
        miner = CTLogMiner()
        ct_entries = await miner.mine(domain)

        async with AsyncSessionLocal() as db:
            repo = ScanRepository(db)
            await repo.update_scan_progress(
                uuid.UUID(scan_id),
                assets_discovered=len(ct_entries),
                current_stage="dns_resolution",
            )
            await db.commit()

        # Step 2: DNS Resolution
        resolver = DNSResolver()
        live_assets, dead_assets = await resolver.resolve_all(ct_entries)

        # Step 3: Port Scanning
        async with AsyncSessionLocal() as db:
            repo = ScanRepository(db)
            await repo.update_scan_progress(
                uuid.UUID(scan_id), current_stage="port_scanning"
            )
            await db.commit()

        scanner = PortScanner()
        port_results = await scanner.scan_all(
            [(a.ip_address, a.fqdn) for a in live_assets if a.ip_address]
        )

        # Step 4: Asset Classification
        classifier = AssetClassifier()
        shadow_fqdns = {a.fqdn for a in live_assets if a.is_shadow_asset}
        classified = await classifier.classify_all(port_results, shadow_fqdns)

        # Persist assets to DB
        async with AsyncSessionLocal() as db:
            repo = ScanRepository(db)
            asset_dicts = []
            for ca in classified:
                asset = await repo.create_asset(
                    scan_job_id=uuid.UUID(scan_id),
                    fqdn=ca.fqdn,
                    asset_url=ca.asset_url,
                    asset_type=ca.asset_type,
                    port=ca.port,
                    ip_address=ca.ip_address,
                    is_shadow_asset=ca.is_shadow_asset,
                )
                asset_dicts.append({
                    "asset_id": str(asset.id),
                    "fqdn": ca.fqdn,
                    "asset_url": ca.asset_url,
                    "asset_type": ca.asset_type,
                    "port": ca.port,
                    "ip_address": ca.ip_address,
                    "is_shadow_asset": ca.is_shadow_asset,
                    "needs_tls_scan": ca.needs_tls_scan,
                    "needs_api_scan": ca.needs_api_scan,
                    "needs_vpn_scan": ca.needs_vpn_scan,
                    "needs_ssh_scan": ca.needs_ssh_scan,
                    "needs_smtp_scan": ca.needs_smtp_scan,
                    "vpn_type": ca.vpn_type,
                })
            await db.commit()

        return asset_dicts

    return asyncio.get_event_loop().run_until_complete(_async_discovery())


def _update_scan_stage(scan_id: str, stage: str, asset_count: int) -> None:
    import asyncio
    from db.session import AsyncSessionLocal
    from db.repository import ScanRepository

    async def _update():
        async with AsyncSessionLocal() as db:
            repo = ScanRepository(db)
            await repo.update_scan_progress(
                uuid.UUID(scan_id),
                assets_discovered=asset_count,
                current_stage=stage,
            )
            await db.commit()

    asyncio.get_event_loop().run_until_complete(_update())


def _mark_scan_failed(scan_id: str, error: str) -> None:
    import asyncio
    from db.session import AsyncSessionLocal
    from db.repository import ScanRepository

    async def _fail():
        async with AsyncSessionLocal() as db:
            repo = ScanRepository(db)
            await repo.update_scan_status(
                uuid.UUID(scan_id), "FAILED", error_message=error
            )
            await db.commit()

    asyncio.get_event_loop().run_until_complete(_fail())
