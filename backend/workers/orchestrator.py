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

    Resilience contract:
    - CT log mining never raises — CTLogMiner falls back internally.
    - DNS resolution failures for individual hosts are skipped (not fatal).
    - Port scan errors for individual hosts are skipped (not fatal).
    - If no assets resolve, we still try the root domain directly.
    """
    import asyncio
    from engine.discovery.ct_log_miner import CTLogMiner
    from engine.discovery.dns_resolver import DNSResolver
    from engine.discovery.port_scanner import PortScanner
    from engine.discovery.asset_classifier import AssetClassifier
    import db.sync_db as sync_db

    async def _async_discovery():
        sync_db.update_scan_status_sync(
            scan_id, "RUNNING", current_stage="ct_mining"
        )

        # ── Step 1: CT Log Mining (always succeeds — internal fallbacks) ───────
        miner = CTLogMiner()
        ct_entries = await miner.mine(domain)

        # Track which sources were actually used for progress display
        sources_used = list({e.source for e in ct_entries})
        log.info(
            "ct_mining_pipeline_result",
            scan_id=scan_id,
            domain=domain,
            entries=len(ct_entries),
            sources=sources_used,
        )

        sync_db.update_scan_progress_sync(
            scan_id,
            assets_discovered=len(ct_entries),
            current_stage="dns_resolution",
        )

        # ── Step 2: DNS Resolution ────────────────────────────────────────────
        resolver = DNSResolver()
        try:
            live_assets, dead_assets = await resolver.resolve_all(ct_entries)
        except Exception as exc:
            log.warning("dns_resolution_error", scan_id=scan_id, error=str(exc))
            live_assets, dead_assets = [], []

        # If no hosts resolved, fall back to scanning the root domain directly
        if not live_assets:
            log.warning(
                "dns_no_live_assets",
                scan_id=scan_id,
                domain=domain,
                msg="No live assets from CT entries. Adding root domain.",
            )
            from engine.discovery.ct_log_miner import CTLogEntry
            root_entry = CTLogEntry(
                fqdn=domain,
                cert_id=None,
                issuer=None,
                not_before=None,
                not_after=None,
                is_wildcard=False,
                source="root_fallback",
            )
            try:
                live_assets, _ = await resolver.resolve_all([root_entry])
            except Exception:
                pass  # classifer will still attempt https:// on the domain

        # ── Step 3: Port Scanning ─────────────────────────────────────────────
        sync_db.update_scan_progress_sync(
            scan_id, current_stage="port_scanning"
        )

        scanner = PortScanner()
        try:
            port_results = await scanner.scan_all(
                [(a.ip_address, a.fqdn) for a in live_assets if a.ip_address]
            )
        except Exception as exc:
            log.warning("port_scan_error", scan_id=scan_id, error=str(exc))
            port_results = []

        # If port scan returned no open ports (firewall blocking), synthesize
        # ports for all live assets so the classifier can still run.
        # Use FQDN heuristics to infer the most likely service type per asset.
        if not any(pr.open_ports for pr in port_results):
            log.warning(
                "port_scan_no_open_ports",
                scan_id=scan_id,
                msg="All ports appear blocked — synthesizing ports via FQDN heuristics",
            )
            from engine.discovery.port_scanner import PortScanResult

            # Keywords that strongly imply non-HTTPS services
            SSH_KW   = {"ssh", "bastion", "jump", "jumphost", "mgmt", "management"}
            VPN_KW   = {"vpn", "vpn-gw", "vpngw", "ssl-vpn", "sslvpn", "remote", "ras", "nac", "forticlient", "anyconnect"}
            SMTP_KW  = {"mail", "smtp", "mx", "relay", "email"}

            def _infer_ports(fqdn: str) -> tuple[list[int], dict[int, str], bool, bool, bool, bool]:
                """Returns (open_ports, services, has_https, has_ssh, has_smtp, has_vpn)."""
                parts = set(fqdn.lower().replace("-", ".").split("."))
                open_ports: list[int] = []
                services: dict[int, str] = {}

                has_ssh   = bool(parts & SSH_KW)
                has_smtp  = bool(parts & SMTP_KW)
                has_vpn   = bool(parts & VPN_KW)

                if has_ssh:
                    open_ports.append(22)
                    services[22] = "ssh"
                if has_smtp:
                    for p in (25, 587):
                        open_ports.append(p)
                        services[p] = "smtp"
                if has_vpn:
                    open_ports.extend([443, 4443])
                    services[443]  = "https"
                    services[4443] = "https-vpn"

                # Default: always add HTTPS so TLS scanner can run
                if 443 not in open_ports:
                    open_ports.append(443)
                    services[443] = "https"

                has_https = 443 in open_ports
                return open_ports, services, has_https, has_ssh, has_smtp, has_vpn

            synthesized = []
            for a in live_assets:
                op, sv, hh, hs, hm, hv = _infer_ports(a.fqdn)
                synthesized.append(PortScanResult(
                    ip_address=a.ip_address or a.fqdn,
                    fqdn=a.fqdn,
                    open_ports=op,
                    services=sv,
                    has_https=hh,
                    has_ssh=hs,
                    has_smtp=hm,
                    has_vpn_ports=hv,
                ))
            port_results = synthesized

        # ── Step 4: Asset Classification ──────────────────────────────────────
        classifier = AssetClassifier()
        shadow_fqdns = {a.fqdn for a in live_assets if a.is_shadow_asset}
        try:
            classified = await classifier.classify_all(port_results, shadow_fqdns)
        except Exception as exc:
            log.warning("asset_classification_error", scan_id=scan_id, error=str(exc))
            classified = []

        # ── Persist assets to DB ──────────────────────────────────────────────
        asset_dicts = []
        shadow_count = 0
        for ca in classified:
            try:
                asset_id = sync_db.create_asset_sync(
                    scan_job_id=scan_id,
                    fqdn=ca.fqdn,
                    asset_url=ca.asset_url,
                    asset_type=ca.asset_type,
                    port=ca.port,
                    ip_address=ca.ip_address,
                    is_shadow_asset=ca.is_shadow_asset,
                )
            except Exception as exc:
                log.warning("asset_persist_error", fqdn=ca.fqdn, error=str(exc))
                continue

            if ca.is_shadow_asset:
                shadow_count += 1

            asset_dicts.append({
                "asset_id": asset_id,
                "scan_id": scan_id,          # ← inject scan_id so scan_tasks can use it
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

        # Update shadow asset count in DB
        if shadow_count:
            try:
                sync_db.update_scan_progress_sync(
                    scan_id,
                    assets_discovered=len(asset_dicts),
                    shadow_assets_found=shadow_count,
                )
            except Exception:
                pass

        return asset_dicts

    return asyncio.run(_async_discovery())


def _update_scan_stage(scan_id: str, stage: str, asset_count: int) -> None:
    import db.sync_db as sync_db
    sync_db.update_scan_progress_sync(
        scan_id,
        assets_discovered=asset_count,
        current_stage=stage,
    )


def _mark_scan_failed(scan_id: str, error: str) -> None:
    import db.sync_db as sync_db
    sync_db.update_scan_status_sync(
        scan_id, "FAILED", error_message=error
    )
