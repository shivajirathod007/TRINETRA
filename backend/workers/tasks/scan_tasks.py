"""
TRINETRA — Per-Asset Scan Task
Enterprise-grade Celery task that runs all applicable scanners on a single
asset, writes the full result to the database, and returns a lean summary
dict for the chord aggregation callback.

Design principles:
- Scanners run in parallel via asyncio.gather
- DB write happens synchronously BEFORE returning to Celery
- The Celery return value is a lean summary (no large JSON blobs)
- Every scanner failure is logged at ERROR level with full context
- Scoring always runs even if all scanners fail (uses conservative defaults)
"""

import asyncio


from workers.celery_app import celery_app
from core.config import settings
from core.logging import get_logger
from core.constants import get_algorithm_risk

log = get_logger(__name__)


@celery_app.task(name="scan_tasks.scan_single_asset", bind=True, max_retries=1)
def scan_single_asset(self, scan_id: str, asset_data: dict) -> dict:
    """
    Runs all applicable scanners on one asset.
    Called in parallel by the orchestrator chord group.
    Returns a lean summary dict for aggregation (no large blobs).
    """
    asset_id = asset_data["asset_id"]
    asset_url = asset_data["asset_url"]

    log.info("asset_scan_started", asset_id=asset_id, url=asset_url)

    try:
        result = asyncio.run(_run_all_scanners(scan_id, asset_data))
        _persist_scan_result(asset_id, scan_id, result)
        
        # Removed: We no longer spawn new DB assets for discovered API endpoints.
        # This was polluting the database and causing inflated, identical counts for
        # Total Assets, TLS certificates, Critical Risks, etc.
        # The endpoints are already stored in `score_breakdown.endpoints_scanned`
        # and the frontend unpacks them natively for the APIs tab.
        # endpoints = result.get("score_breakdown", {}).get("endpoints_scanned", [])
        # if endpoints:
        #     _persist_endpoints_as_assets(scan_id, asset_data, endpoints, result)

        log.info(
            "asset_scan_complete",
            asset_id=asset_id,
            url=asset_url,
            score=result.get("quantum_exposure_score"),
            risk=result.get("risk_level"),
            tls=result.get("tls_version_active"),
            cert_algo=result.get("cert_algorithm"),
        )

        # Return lean summary — no large JSON blobs in Celery result
        return {
            "asset_id": asset_id,
            "status": "completed",
            "quantum_exposure_score": result.get("quantum_exposure_score"),
            "risk_level": result.get("risk_level"),
            "quantum_safe_status": result.get("quantum_safe_status"),
            "is_shadow_asset": asset_data.get("is_shadow_asset", False),
        }

    except Exception as e:
        log.error("asset_scan_failed", asset_id=asset_id, url=asset_url,
                  error=str(e), exc_info=True)
        _persist_failure(asset_id, str(e)[:500])
        return {"asset_id": asset_id, "status": "failed", "error": str(e)[:200]}


async def _run_all_scanners(scan_id: str, asset_data: dict) -> dict:
    """
    Runs all scanner workers concurrently with a 120s hard timeout per asset.
    Returns a complete flat dict of all scan fields for DB storage.
    """
    try:
        return await asyncio.wait_for(
            _run_scanners_inner(scan_id, asset_data),
            timeout=45.0,  # 45s max per asset — TLS fast mode + 8s HTTP + 5s SSH
        )
    except asyncio.TimeoutError:
        asset_url = asset_data.get("asset_url", "unknown")
        log.error("asset_scan_timeout", url=asset_url, timeout=120)
        # Return minimal result with conservative defaults so scoring still runs
        from engine.analysis.exposure_scorer import ExposureScorer
        from engine.analysis.hndl_engine import HNDLEngine
        scorer = ExposureScorer()
        score_result = scorer.score(
            asset_url=asset_url,
            algorithm="RSA-2048",
            asset_type=asset_data.get("asset_type", "web_portal"),
            cert_expiry_days=365,
            crqc_year=settings.crqc_moderate_year,
            is_shadow_asset=asset_data.get("is_shadow_asset", False),
        )
        hndl_result = HNDLEngine().calculate(
            asset_url=asset_url,
            algorithm="RSA-2048",
            cert_expiry_days=365,
        )
        return {
            "quantum_safe_status": score_result.quantum_safe_status,
            "quantum_exposure_score": score_result.score,
            "risk_level": score_result.risk_level,
            "hndl_deadline": hndl_result.primary_deadline,
            "hndl_urgency": hndl_result.urgency_level,
            "data_sensitivity_tier": "static",
            "data_sensitivity_tier_source": "auto_detected",
            "score_breakdown": {
                "algorithm_risk": score_result.breakdown.algorithm_risk_raw,
                "hndl_timeline": score_result.breakdown.hndl_timeline_raw,
                "public_exposure": score_result.breakdown.public_exposure_raw,
                "weights": score_result.breakdown.weights,
                "formula": "Score = (AlgRisk×0.40) + (HNDLTimeline×0.40) + (Exposure×0.20)",
                "note": "Timeout fallback — scanners did not complete in 120s",
            },
            "_pqc_certificate_data": None,
        }


async def _run_scanners_inner(scan_id: str, asset_data: dict) -> dict:
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
    from engine.ai.classifier import classify_http_response
    from engine.ai.schemas import ClassifierInput

    hostname = asset_data["fqdn"]
    port = asset_data.get("port", 443)
    asset_url = asset_data["asset_url"]
    asset_type = asset_data["asset_type"]
    vpn_type = asset_data.get("vpn_type")
    is_shadow = asset_data.get("is_shadow_asset", False)

    # Determine which scanners to run based on asset type
    # Always run TLS + cert + API for ALL HTTPS assets — we can't know
    # what's behind a URL until we probe it. Classification is a hint, not a gate.
    run_tls = port in (443, 8443, 4433, 10443) or asset_type not in ("ssh_endpoint", "smtp_mta")
    run_api = run_tls  # Always inspect HTTP for any HTTPS asset
    run_vpn = asset_type == "vpn_gateway" or asset_data.get("needs_vpn_scan", False)
    run_ssh = asset_type == "ssh_endpoint" or asset_data.get("needs_ssh_scan", False)
    run_smtp = asset_type == "smtp_mta" or asset_data.get("needs_smtp_scan", False)

    # ── Build scanner task list ───────────────────────────────────────────────
    tls_result = None
    cert_info = None
    api_result = None
    vpn_result = None
    ssh_result = None
    smtp_result = None

    tasks = []
    task_names = []

    if run_tls:
        tasks.append(TLSScanner().scan(hostname, port))
        task_names.append("tls")

    if run_api:
        tasks.append(APIInspector().inspect(asset_url))
        task_names.append("api")

    if run_vpn:
        tasks.append(VPNDetector().detect(hostname, port))
        task_names.append("vpn")

    # Synchronous scanners run in thread executor
    loop = asyncio.get_running_loop()

    if run_tls:
        tasks.append(loop.run_in_executor(None, CertAnalyzer().analyze, hostname, port))
        task_names.append("cert")

    if run_ssh:
        tasks.append(loop.run_in_executor(None, SSHProbe().probe, hostname, 22))
        task_names.append("ssh")

    if run_smtp:
        tasks.append(loop.run_in_executor(None, SMTPTLSScanner().scan, hostname, port))
        task_names.append("smtp")

    # ── Execute all in parallel ───────────────────────────────────────────────
    if tasks:
        gathered = await asyncio.gather(*tasks, return_exceptions=True)
        for name, res in zip(task_names, gathered):
            if isinstance(res, Exception):
                log.error(f"scanner_{name}_exception",
                          hostname=hostname, url=asset_url, error=str(res), exc_info=res)
                continue
            if name == "tls":
                if res and not res.error:
                    tls_result = res
                elif res and res.error:
                    log.warning("tls_scan_error", hostname=hostname, error=res.error)
            elif name == "cert":
                if res and res.signature_algorithm != "UNKNOWN":
                    cert_info = res
                else:
                    log.warning("cert_scan_empty", hostname=hostname)
            elif name == "api":
                if res and not res.error:
                    api_result = res
                elif res and res.error:
                    log.warning("api_scan_error", url=asset_url, error=res.error)
            elif name == "vpn":
                vpn_result = res[0] if res else None
            elif name == "ssh":
                ssh_result = res if res and not res.error else None
            elif name == "smtp":
                smtp_result = res if res and not res.error else None

    # ── Extract primary algorithm ─────────────────────────────────────────────
    primary_algorithm = _extract_primary_algorithm(tls_result, cert_info, ssh_result, smtp_result, port)
    key_exchange = tls_result.key_exchange if tls_result else None
    jwt_algorithm = api_result.jwt_algorithm if api_result else None

    # Cert expiry — use actual value, default 365 days if unavailable
    cert_expiry_days = 365
    if cert_info and cert_info.days_until_expiry is not None:
        cert_expiry_days = max(0, cert_info.days_until_expiry)
    elif smtp_result and smtp_result.cert_expiry_days is not None:
        cert_expiry_days = max(0, smtp_result.cert_expiry_days)

    log.info(
        "scanner_results_summary",
        hostname=hostname,
        primary_algo=primary_algorithm,
        kex=key_exchange,
        tls_version=tls_result.highest_version if tls_result else None,
        cert_algo=cert_info.signature_algorithm if cert_info else None,
        cert_expiry_days=cert_expiry_days,
        jwt_algo=jwt_algorithm,
    )

    # ── Data sensitivity tier ─────────────────────────────────────────────────
    data_sensitivity_tier = "static"
    data_sensitivity_tier_source = "auto_detected"
    data_shelf_life_years = 0.0
    try:
        from engine.discovery.sensitivity_detector import SensitivityDetector
        sr = SensitivityDetector().detect(
            fqdn=hostname,
            asset_url=asset_url,
            asset_type=asset_type,
            jwt_algorithm=jwt_algorithm,
        )
        data_sensitivity_tier = sr.tier
        data_sensitivity_tier_source = sr.source
        data_shelf_life_years = sr.shelf_life_years
    except Exception as exc:
        log.warning("sensitivity_detector_error", url=asset_url, error=str(exc))

    # ── AI Classifier ─────────────────────────────────────────────────────────
    ai_detections = []
    try:
        if api_result and (api_result.response_body_preview or api_result.response_headers_raw):
            payload = ClassifierInput(
                asset_url=asset_url,
                asset_type=asset_type,
                status_code=api_result.http_status or 200,
                response_headers=str(api_result.response_headers_raw or ""),
                response_body=api_result.response_body_preview or "",
                request_method="GET",
                request_url=asset_url,
                tls_cipher_suite=tls_result.active_cipher_suite if tls_result else None,
                cert_algorithm=cert_info.signature_algorithm if cert_info else None,
            )
            ai_output = await classify_http_response(payload)
            if ai_output and ai_output.detections:
                ai_detections = [
                    d.model_dump() if hasattr(d, "model_dump") else dict(d)
                    for d in ai_output.detections
                ]
                # Promote AI-detected algorithm if higher risk
                ai_algos = [
                    d.get("algorithm_detected", "")
                    for d in ai_detections
                    if d.get("algorithm_detected") not in (None, "", "UNKNOWN", "CLEAN")
                ]
                if ai_algos:
                    best_ai = max(ai_algos, key=lambda a: get_algorithm_risk(a))
                    if get_algorithm_risk(best_ai) > get_algorithm_risk(primary_algorithm):
                        log.info("ai_algorithm_promoted",
                                 prev=primary_algorithm, promoted=best_ai, url=asset_url)
                        primary_algorithm = best_ai
    except Exception as exc:
        log.warning("ai_classifier_error", url=asset_url, error=str(exc))

    # ── Evaluate custom rules ─────────────────────────────────────────────────
    import fnmatch
    import db.sync_db as sync_db
    custom_override_status = None
    try:
        active_rules = sync_db.get_active_scan_rules_sync()
        for rule in active_rules:
            m_type = rule["match_type"].upper()
            pat = rule["pattern"]
            
            if m_type == "HOSTNAME":
                if fnmatch.fnmatch(hostname, pat):
                    custom_override_status = rule["override_status"]
                    break
            elif m_type == "CIPHER_SUITE":
                if tls_result and tls_result.active_cipher_suite and fnmatch.fnmatch(tls_result.active_cipher_suite, pat):
                    custom_override_status = rule["override_status"]
                    break
            elif m_type == "PROTOCOL":
                if tls_result and tls_result.highest_version and fnmatch.fnmatch(tls_result.highest_version, pat):
                    custom_override_status = rule["override_status"]
                    break
            elif m_type == "IP_ADDRESS":
                ip_addr = asset_data.get("ip_address")
                if ip_addr and fnmatch.fnmatch(ip_addr, pat):
                    custom_override_status = rule["override_status"]
                    break
            elif m_type == "PORT":
                if str(port) == pat:
                    custom_override_status = rule["override_status"]
                    break
            elif m_type == "ALGORITHM":
                algo = cert_info.signature_algorithm if cert_info else primary_algorithm
                if algo and fnmatch.fnmatch(algo, pat):
                    custom_override_status = rule["override_status"]
                    break
            elif m_type == "VPN_PROTOCOL":
                vpn = vpn_result.vpn_type if vpn_result else vpn_type
                if vpn and fnmatch.fnmatch(vpn, pat):
                    custom_override_status = rule["override_status"]
                    break
            elif m_type == "SSH_PROTOCOL":
                ssh = ssh_result.server_version if ssh_result else None
                if ssh and fnmatch.fnmatch(ssh, pat):
                    custom_override_status = rule["override_status"]
                    break
    except Exception as exc:
        log.warning("custom_rules_evaluation_failed", url=asset_url, error=str(exc))

    # ── Scoring (always runs — never returns None) ────────────────────────────
    scorer = ExposureScorer()
    score_result = scorer.score(
        asset_url=asset_url,
        algorithm=primary_algorithm,
        asset_type=asset_type,
        cert_expiry_days=cert_expiry_days,
        crqc_year=settings.crqc_moderate_year,
        is_shadow_asset=is_shadow,
        key_exchange=key_exchange,
        jwt_algorithm=jwt_algorithm,
        data_sensitivity_tier=data_sensitivity_tier,
        custom_override_status=custom_override_status,
        http_server_software=api_result.response_headers_raw.get("Server") if api_result and api_result.response_headers_raw else None,
        ssh_host_key=ssh_result.host_key_algorithm if ssh_result else None,
    )

    hndl_result = HNDLEngine().calculate(
        asset_url=asset_url,
        algorithm=primary_algorithm,
        cert_expiry_days=cert_expiry_days,
        data_sensitivity_tier=data_sensitivity_tier,
    )

    migration_plan = MigrationPlanner().plan(
        asset_url=asset_url,
        asset_type=asset_type,
        current_algorithm=primary_algorithm,
        current_kex=key_exchange,
        current_tls_version=tls_result.highest_version if tls_result else None,
        jwt_algorithm=jwt_algorithm,
        vpn_type=vpn_type,
        ssh_host_key=ssh_result.host_key_algorithm if ssh_result else None,
        data_sensitivity_tier=data_sensitivity_tier,
    )

    log.info(
        "scoring_complete",
        url=asset_url,
        score=score_result.score,
        risk=score_result.risk_level,
        pqc_status=score_result.quantum_safe_status,
        deadline=hndl_result.primary_deadline,
    )

    # ── PQC Certificate ───────────────────────────────────────────────────────
    certificate = None

    try:
        certificate = CertificateIssuer().issue(
            asset_url=asset_url,
            score_result=score_result,
            scan_id=scan_id,
            key_exchange=key_exchange,
            signature_algorithm=cert_info.signature_algorithm if cert_info else None,
        )
    except Exception as exc:
        log.warning("certificate_issue_failed", url=asset_url, error=str(exc))

    # ── CBOM Entry ────────────────────────────────────────────────────────────
    cbom_entry = None
    try:
        class _Asset:
            fqdn = hostname
            ip_address = asset_data.get("ip_address")
            port = asset_data.get("port", 443)
            asset_type = asset_data["asset_type"]
            asset_url = asset_data["asset_url"]
            is_shadow_asset = is_shadow

        cbom_entry = CBOMGenerator().generate_asset_entry(
            asset=_Asset(),
            tls_result=tls_result,
            cert_info=cert_info,
            api_result=api_result,
            ssh_result=ssh_result,
            score_result=score_result,
            hndl_result=hndl_result,
            scan_id=scan_id,
            pqc_certificate_id=certificate["certificate_id"] if certificate else None,
            ai_detections=ai_detections,
            data_sensitivity_tier=data_sensitivity_tier,
            data_sensitivity_tier_source=data_sensitivity_tier_source,
            data_shelf_life_years=data_shelf_life_years,
        )
    except Exception as exc:
        log.warning("cbom_generation_failed", url=asset_url, error=str(exc))

    # ── Merge Vulnerabilities & Findings ──────────────────────────────────────
    vulns = []
    if tls_result and tls_result.vulnerabilities:
        vulns.extend(tls_result.vulnerabilities)
    if api_result and api_result.findings:
        vulns.extend(api_result.findings)

    # ── Build complete DB record ──────────────────────────────────────────────
    return {
        # TLS
        "tls_versions_supported": tls_result.supported_versions if tls_result else [],
        "tls_version_active": tls_result.highest_version if tls_result else None,
        "cipher_suite_active": tls_result.active_cipher_suite if tls_result else None,
        "cipher_suites_all": tls_result.cipher_suites if tls_result else {},
        "key_exchange": key_exchange,
        "vulnerabilities": vulns,
        # Certificate
        "cert_algorithm": (
            cert_info.signature_algorithm if cert_info
            else (f"RSA-{cert_info.key_length_bits}" if cert_info and cert_info.key_length_bits else primary_algorithm)
        ),
        "cert_key_length": cert_info.key_length_bits if cert_info else None,
        "cert_expiry": cert_info.not_after.isoformat() if cert_info and cert_info.not_after else None,
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
        "http_server_software": api_result.response_headers_raw.get("Server") if api_result and api_result.response_headers_raw else None,
        "graphql_introspection": api_result.graphql_introspection if api_result else None,
        # VPN
        "vpn_type": vpn_result.vpn_type if vpn_result else vpn_type,
        # SSH
        "ssh_host_key_algorithm": ssh_result.host_key_algorithm if ssh_result else None,
        "ssh_kex_methods": ssh_result.kex_methods if ssh_result else [],
        "ssh_server_version": ssh_result.server_version if ssh_result else None,
        # AI
        "ai_detections": ai_detections,
        "ai_fallback_used": False,
        "detection_sources": _build_detection_sources(
            tls_result, cert_info, api_result, ssh_result, ai_detections
        ),
        # Risk — always populated
        "quantum_safe_status": score_result.quantum_safe_status,
        "quantum_exposure_score": score_result.score,
        "risk_level": score_result.risk_level,
        "score_breakdown": {
            "algorithm_risk": score_result.breakdown.algorithm_risk_raw,
            "hndl_timeline": score_result.breakdown.hndl_timeline_raw,
            "public_exposure": score_result.breakdown.public_exposure_raw,
            "weights": score_result.breakdown.weights,
            "data_sensitivity_tier": score_result.breakdown.data_sensitivity_tier,
            "data_shelf_life_years": score_result.breakdown.data_shelf_life_years,
            "sensitivity_tier_impact": score_result.breakdown.sensitivity_tier_impact,
            "formula": "Score = (AlgRisk×0.40) + (HNDLTimeline[sensitivity-adjusted]×0.40) + (Exposure×0.20)",
            "endpoints_scanned": api_result.endpoints_scanned if api_result else [],
        },
        "hndl_deadline": hndl_result.primary_deadline,
        "hndl_urgency": hndl_result.urgency_level,
        # Sensitivity
        "data_sensitivity_tier": data_sensitivity_tier,
        "data_sensitivity_tier_source": data_sensitivity_tier_source,
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
            "data_sensitivity_tier": migration_plan.data_sensitivity_tier,
            "tier_rationale": migration_plan.tier_rationale,
        } if migration_plan else None,
        # Certificate stored separately
        "_pqc_certificate_data": certificate,
    }


def _extract_primary_algorithm(tls_result, cert_info, ssh_result, smtp_result, port: int) -> str:
    """
    Returns the most quantum-relevant algorithm detected.
    Priority: cert signature > TLS KEX > SSH host key > fallback.
    """
    if port == 80:
        return "CLEARTEXT"
    if cert_info and cert_info.signature_algorithm not in ("UNKNOWN", None, ""):
        sig = cert_info.signature_algorithm.upper()
        bits = cert_info.key_length_bits or 2048
        if "RSA" in sig:
            return f"RSA-{bits}"
        if "ECDSA" in sig or "EC-" in sig:
            return f"ECDSA-{bits}"
        if "ED25519" in sig:
            return "ED25519"
        if "ED448" in sig:
            return "ED448"
        return cert_info.signature_algorithm

    if tls_result and tls_result.key_exchange not in ("UNKNOWN", None, ""):
        return tls_result.key_exchange

    if ssh_result and ssh_result.host_key_algorithm:
        return ssh_result.host_key_algorithm

    if smtp_result and smtp_result.cert_algorithm:
        return smtp_result.cert_algorithm

    # Conservative fallback — RSA-2048 is the most common legacy algorithm
    return "RSA-2048"


def _build_detection_sources(tls_result, cert_info, api_result, ssh_result, ai_detections) -> list:
    sources = []
    if tls_result and not tls_result.error:
        sources.append("tls_scanner")
    if cert_info and cert_info.signature_algorithm not in ("UNKNOWN", None):
        sources.append("cert_analyzer")
    if api_result and not api_result.error:
        sources.append("api_inspector")
    if ssh_result and not getattr(ssh_result, "error", None):
        sources.append("ssh_probe")
    if ai_detections:
        sources.append("ai_classifier")
    return sources


def _persist_scan_result(asset_id: str, scan_id: str, result: dict) -> None:
    """
    Writes the full scan result to the database.
    Handles PQC certificate creation separately.
    Never filters out None values — DB columns are nullable.
    """
    import db.sync_db as sync_db

    # Extract and persist PQC certificate separately (not a DB column)
    cert_data = result.pop("_pqc_certificate_data", None)
    pqc_cert_id = None
    if cert_data:
        try:
            cert_data["scan_job_id"] = scan_id
            pqc_cert_id = sync_db.create_certificate_sync(cert_data)
            log.info("pqc_cert_created", asset_id=asset_id, cert_id=pqc_cert_id)
        except Exception as e:
            log.warning("cert_persist_failed", asset_id=asset_id, error=str(e))

    # Build the scan data dict — include all fields
    scan_data = dict(result)
    if pqc_cert_id:
        scan_data["pqc_certificate_id"] = pqc_cert_id

    sync_db.update_asset_scan_result_sync(asset_id, scan_data)
    log.info("asset_result_persisted", asset_id=asset_id,
             score=result.get("quantum_exposure_score"),
             risk=result.get("risk_level"))


def _persist_failure(asset_id: str, error: str) -> None:
    import db.sync_db as sync_db
    sync_db.mark_asset_failed_sync(asset_id, error)


def _persist_endpoints_as_assets(scan_id: str, parent_asset_data: dict, endpoints: list[str], parent_scan_result: dict) -> None:
    """Creates duplicate cloned asset rows for discovered endpoints so they show in the UI table."""
    import db.sync_db as sync_db
    import re
    
    # Filter out root paths, empty strings, and generic HTML paths ("bullshit things")
    valid_endpoints = []
    for ep in endpoints:
        if not ep or ep == "/":
            continue
            
        ep_lower = ep.lower()
        # Filter out static files and common non-relevant extensions
        if re.search(r'\.(html|htm|php|pdf|doc|docx|css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|pdf|webp|mp4|webm|zip|gz|tar)$', ep_lower):
            continue
            
        # If it passed the above filters, it's a valid endpoint for discovery
        valid_endpoints.append(ep)

    if not valid_endpoints:
        return
        
    log.info("persisting_discovered_endpoints", parent=parent_asset_data["fqdn"], count=len(valid_endpoints))
    
    base_url = parent_asset_data["asset_url"].rstrip("/")
    for ep in valid_endpoints:
        ep_url = base_url + ep
        
        # 1. Create a DB asset clone
        ep_asset_id = sync_db.create_asset_sync(
            scan_job_id=scan_id,
            fqdn=parent_asset_data["fqdn"],
            asset_url=ep_url,
            asset_type="api_endpoint",  # Mark as API endpoint
            port=parent_asset_data.get("port", 443),
            ip_address=parent_asset_data.get("ip_address"),
            is_shadow_asset=parent_asset_data.get("is_shadow_asset", False),
            discovery_method="api_inspector_crawl",
        )
        
        # 2. Duplicate the scan result
        ep_result = parent_scan_result.copy()
        sync_db.update_asset_scan_result_sync(ep_asset_id, ep_result)
