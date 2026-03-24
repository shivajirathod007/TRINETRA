"""
TRINETRA — Per-Asset Scan Task
Celery task that runs all applicable scanners on a single asset
and writes the merged result to the database.
"""

import asyncio
import uuid
from typing import Optional

from workers.celery_app import celery_app
from core.config import settings
from core.logging import get_logger

log = get_logger(__name__)


@celery_app.task(name="scan_tasks.scan_single_asset", bind=True, max_retries=2)
def scan_single_asset(self, scan_id: str, asset_data: dict) -> dict:
    """
    Runs all applicable scanners on one asset.
    Called in parallel by the orchestrator chord group.

    Returns merged scan result dict for aggregation.
    """
    asset_id = asset_data["asset_id"]
    asset_url = asset_data["asset_url"]
    asset_type = asset_data["asset_type"]
    hostname = asset_data["fqdn"]
    port = asset_data.get("port", 443)

    log.info("asset_scan_started", asset_id=asset_id, url=asset_url)

    try:
        result = asyncio.get_event_loop().run_until_complete(
            _run_all_scanners(asset_data)
        )
        _persist_scan_result(asset_id, scan_id, result)

        log.info(
            "asset_scan_complete",
            asset_id=asset_id,
            score=result.get("quantum_exposure_score"),
            status=result.get("quantum_safe_status"),
        )
        return {"asset_id": asset_id, "status": "completed", **result}

    except Exception as e:
        log.error("asset_scan_failed", asset_id=asset_id, error=str(e))
        _persist_failure(asset_id, str(e)[:500])
        return {"asset_id": asset_id, "status": "failed", "error": str(e)[:200]}


async def _run_all_scanners(asset_data: dict) -> dict:
    """
    Runs all five scanner workers concurrently on the asset.
    Merges results into a single flat dict for DB storage.
    """
    from engine.scanners.tls_scanner import TLSScanner
    from engine.scanners.cert_analyzer import CertAnalyzer
    from engine.scanners.vpn_detector import VPNDetector
    from engine.scanners.api_inspector import APIInspector
    from engine.scanners.ssh_probe import SSHProbe
    from engine.scanners.smtp_tls import SMTPTLSScanner
    from engine.analysis.exposure_scorer import ExposureScorer
    from engine.analysis.hndl_engine import HNDLEngine
    from engine.analysis.cbom_generator import CBOMGenerator
    from engine.analysis.migration_planner import MigrationPlanner
    from engine.output.certificate_issuer import CertificateIssuer
    from engine.discovery.asset_classifier import ClassifiedAsset
    from engine.ai.classifier import classify_http_response
    from engine.ai.schemas import ClassifierInput

    hostname = asset_data["fqdn"]
    port = asset_data.get("port", 443)
    asset_url = asset_data["asset_url"]
    asset_type = asset_data["asset_type"]
    needs_tls = asset_data.get("needs_tls_scan", True)
    needs_api = asset_data.get("needs_api_scan", False)
    needs_vpn = asset_data.get("needs_vpn_scan", False)
    needs_ssh = asset_data.get("needs_ssh_scan", False)
    needs_smtp = asset_data.get("needs_smtp_scan", False)
    vpn_type = asset_data.get("vpn_type")

    loop = asyncio.get_event_loop()

    # ── Run scanners in parallel where possible ───────────────────────────────
    tls_result = None
    cert_info = None
    api_result = None
    vpn_result = None
    ssh_result = None
    smtp_result = None

    tasks = []

    if needs_tls:
        tls_scanner = TLSScanner()
        tasks.append(("tls", tls_scanner.scan(hostname, port)))

    if needs_api:
        api_inspector = APIInspector()
        tasks.append(("api", api_inspector.inspect(asset_url)))

    if needs_vpn:
        vpn_detector = VPNDetector()
        tasks.append(("vpn", vpn_detector.detect(hostname, port)))

    # Cert analyzer and SSH probe are synchronous — run in executor
    if needs_tls:
        cert_analyzer = CertAnalyzer()
        tasks.append((
            "cert",
            loop.run_in_executor(None, cert_analyzer.analyze, hostname, port)
        ))

    if needs_ssh:
        ssh_probe = SSHProbe()
        tasks.append((
            "ssh",
            loop.run_in_executor(None, ssh_probe.probe, hostname, 22)
        ))

    if needs_smtp:
        smtp_scanner = SMTPTLSScanner()
        tasks.append((
            "smtp",
            loop.run_in_executor(None, smtp_scanner.scan, hostname, port)
        ))

    # Execute all in parallel
    if tasks:
        names = [t[0] for t in tasks]
        coroutines = [t[1] for t in tasks]
        results = await asyncio.gather(*coroutines, return_exceptions=True)

        for name, result in zip(names, results):
            if isinstance(result, Exception):
                log.warning(f"scanner_{name}_failed", hostname=hostname, error=str(result))
                continue
            if name == "tls":
                tls_result = result
            elif name == "cert":
                cert_info = result
            elif name == "api":
                api_result = result
            elif name == "vpn":
                vpn_result = result[0] if result else None
            elif name == "ssh":
                ssh_result = result
            elif name == "smtp":
                smtp_result = result

    # ── Determine primary algorithm for scoring ───────────────────────────────
    primary_algorithm = _extract_primary_algorithm(tls_result, cert_info, ssh_result)
    key_exchange = tls_result.key_exchange if tls_result else None
    jwt_algorithm = api_result.jwt_algorithm if api_result else None
    cert_expiry_days = cert_info.days_until_expiry if cert_info and cert_info.days_until_expiry else 365

    # ── Run analysis engines ──────────────────────────────────────────────────
    scorer = ExposureScorer()
    score_result = scorer.score(
        asset_url=asset_url,
        algorithm=primary_algorithm,
        asset_type=asset_type,
        cert_expiry_days=cert_expiry_days,
        crqc_year=settings.crqc_moderate_year,
        is_shadow_asset=asset_data.get("is_shadow_asset", False),
        key_exchange=key_exchange,
        jwt_algorithm=jwt_algorithm,
    )

    hndl_engine = HNDLEngine()
    hndl_result = hndl_engine.calculate(
        asset_url=asset_url,
        algorithm=primary_algorithm,
        cert_expiry_days=cert_expiry_days,
    )

    planner = MigrationPlanner()
    migration_plan = planner.plan(
        asset_url=asset_url,
        asset_type=asset_type,
        current_algorithm=primary_algorithm,
        current_kex=key_exchange,
        current_tls_version=tls_result.highest_version if tls_result else None,
        jwt_algorithm=jwt_algorithm,
        vpn_type=vpn_type,
        ssh_host_key=ssh_result.host_key_algorithm if ssh_result else None,
    )

    # ── Issue PQC certificate ─────────────────────────────────────────────────
    issuer = CertificateIssuer()
    certificate = issuer.issue(
        asset_url=asset_url,
        score_result=score_result,
        scan_id=asset_data.get("scan_id", ""),
        key_exchange=key_exchange,
        signature_algorithm=cert_info.signature_algorithm if cert_info else None,
    )

    # ── Run AI Classifier ─────────────────────────────────────────────────────
    ai_detections = []
    if api_result and api_result.response_body_preview:
        payload = ClassifierInput(
            asset_url=asset_url,
            asset_type=asset_type,
            status_code=api_result.http_status or 200,
            response_headers=api_result.response_headers_raw,
            response_body=api_result.response_body_preview,
            request_method="GET",
            request_url=asset_url,
            tls_cipher_suite=tls_result.active_cipher_suite if tls_result else None,
            cert_algorithm=cert_info.signature_algorithm if cert_info else None
        )
        ai_output = await classify_http_response(payload)
        if hasattr(ai_output.detections[0], "model_dump") if ai_output.detections else False:
            ai_detections = [d.model_dump() for d in ai_output.detections]
        else:
            ai_detections = [dict(d) for d in ai_output.detections]

    # ── Generate CBOM entry ───────────────────────────────────────────────────
    # Build a minimal ClassifiedAsset for the CBOM generator
    from dataclasses import dataclass

    cbom_gen = CBOMGenerator()

    # Simplified asset object for CBOM
    class _Asset:
        fqdn = asset_data["fqdn"]
        ip_address = asset_data.get("ip_address")
        port = asset_data.get("port", 443)
        asset_type = asset_data["asset_type"]
        asset_url = asset_data["asset_url"]
        is_shadow_asset = asset_data.get("is_shadow_asset", False)

    cbom_entry = cbom_gen.generate_asset_entry(
        asset=_Asset(),
        tls_result=tls_result,
        cert_info=cert_info,
        api_result=api_result,
        ssh_result=ssh_result,
        score_result=score_result,
        hndl_result=hndl_result,
        scan_id=asset_data.get("scan_id", ""),
        pqc_certificate_id=certificate["certificate_id"],
        ai_detections=ai_detections,
    )

    # ── Build flat result dict for DB persistence ─────────────────────────────
    return {
        # TLS
        "tls_versions_supported": tls_result.supported_versions if tls_result else [],
        "tls_version_active": tls_result.highest_version if tls_result else None,
        "cipher_suite_active": tls_result.active_cipher_suite if tls_result else None,
        "cipher_suites_all": tls_result.cipher_suites if tls_result else {},
        "key_exchange": key_exchange,
        "vulnerabilities": tls_result.vulnerabilities if tls_result else [],
        # Certificate
        "cert_algorithm": cert_info.signature_algorithm if cert_info else None,
        "cert_key_length": cert_info.key_length_bits if cert_info else None,
        "cert_expiry": cert_info.not_after if cert_info else None,
        "cert_expiry_days": cert_expiry_days,
        "cert_issuer": cert_info.issuer_org if cert_info else None,
        "cert_subject": cert_info.subject_cn if cert_info else None,
        "cert_sha256": cert_info.sha256_fingerprint if cert_info else None,
        "cert_is_self_signed": cert_info.is_self_signed if cert_info else False,
        "ocsp_stapling": cert_info.has_ocsp_stapling if cert_info else None,
        "hsts_enabled": api_result.hsts_enabled if api_result else None,
        "hsts_max_age": api_result.hsts_max_age if api_result else None,
        # API
        "jwt_algorithm": jwt_algorithm,
        "auth_type": api_result.auth_type if api_result else None,
        "cors_policy": api_result.cors_policy if api_result else None,
        "graphql_introspection": api_result.graphql_introspection if api_result else None,
        # VPN
        "vpn_type": vpn_result.vpn_type if vpn_result else vpn_type,
        # SSH
        "ssh_host_key_algorithm": ssh_result.host_key_algorithm if ssh_result else None,
        "ssh_kex_methods": ssh_result.kex_methods if ssh_result else [],
        "ssh_server_version": ssh_result.server_version if ssh_result else None,
        # Risk
        "quantum_safe_status": score_result.quantum_safe_status,
        "quantum_exposure_score": score_result.score,
        "risk_level": score_result.risk_level,
        "score_breakdown": {
            "algorithm_risk": score_result.breakdown.algorithm_risk_raw,
            "hndl_timeline": score_result.breakdown.hndl_timeline_raw,
            "public_exposure": score_result.breakdown.public_exposure_raw,
            "weights": score_result.breakdown.weights,
        },
        "hndl_deadline": hndl_result.primary_deadline,
        "hndl_urgency": hndl_result.urgency_level,
        # CBOM + Plan
        "cbom_entry": cbom_entry,
        "migration_plan": {
            "steps": [
                {
                    "step": s.step_number,
                    "title": s.title,
                    "description": s.description,
                    "nist_reference": s.nist_reference,
                    "command_example": s.command_example,
                    "estimated_hours": s.estimated_hours,
                }
                for s in migration_plan.steps
            ],
            "estimated_sprints": migration_plan.estimated_sprints,
            "complexity": migration_plan.complexity,
            "immediate_action": migration_plan.immediate_action,
            "nist_standards": migration_plan.nist_standards_applied,
        },
        # Certificate
        "pqc_certificate_data": certificate,
    }


def _extract_primary_algorithm(tls_result, cert_info, ssh_result) -> str:
    """Extract the most relevant algorithm for scoring."""
    if cert_info and cert_info.signature_algorithm not in ("UNKNOWN", None):
        return cert_info.signature_algorithm
    if tls_result and tls_result.key_exchange not in ("UNKNOWN", None):
        return tls_result.key_exchange
    if ssh_result and ssh_result.host_key_algorithm:
        return ssh_result.host_key_algorithm
    return "RSA-2048"  # Conservative fallback


def _persist_scan_result(asset_id: str, scan_id: str, result: dict) -> None:
    """Writes scan result to database."""
    import db.sync_db as sync_db

    # Persist PQC certificate
    cert_data = result.pop("pqc_certificate_data", None)
    pqc_cert_id = None
    if cert_data:
        cert_data["scan_job_id"] = scan_id
        pqc_cert_id = sync_db.create_certificate_sync(cert_data)

    # Write all scan fields
    scan_data = {k: v for k, v in result.items() if v is not None}
    if pqc_cert_id:
        scan_data["pqc_certificate_id"] = pqc_cert_id

    sync_db.update_asset_scan_result_sync(asset_id, scan_data)


def _persist_failure(asset_id: str, error: str) -> None:
    import db.sync_db as sync_db
    sync_db.mark_asset_failed_sync(asset_id, error)
