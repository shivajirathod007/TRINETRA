import uuid
import psycopg2
import psycopg2.extras
import json
from datetime import datetime, timezone
from core.config import settings
from core.logging import get_logger

log = get_logger(__name__)

# Convert psycopg2 JSON
psycopg2.extras.register_uuid()


def get_sync_conn():
    """Resturns a synchronous psycopg2 connection."""
    return psycopg2.connect(settings.database_url_sync)


def update_scan_status_sync(scan_id: str, status: str, current_stage: str = None, error_message: str = None) -> None:
    try:
        with get_sync_conn() as conn:
            with conn.cursor() as cur:
                updates = ["status = %s"]
                params = [status]
                
                if current_stage:
                    updates.append("current_stage = %s")
                    params.append(current_stage)
                
                if error_message:
                    updates.append("error_message = %s")
                    params.append(error_message)

                if status == "RUNNING":
                    updates.append("started_at = %s")
                    params.append(datetime.now(timezone.utc))
                
                if status in ("COMPLETED", "FAILED"):
                    updates.append("completed_at = %s")
                    params.append(datetime.now(timezone.utc))

                query = f"UPDATE scan_jobs SET {', '.join(updates)} WHERE id = %s"
                params.append(scan_id)
                
                cur.execute(query, params)
            conn.commit()
    except Exception as e:
        log.error("sync_db_update_scan_status_failed", scan_id=scan_id, status=status, error=str(e))
        raise


def update_scan_progress_sync(scan_id: str, assets_discovered: int = None, assets_scanned: int = None, current_stage: str = None, shadow_assets_found: int = None) -> None:
    try:
        with get_sync_conn() as conn:
            with conn.cursor() as cur:
                updates = []
                params = []
                
                if assets_discovered is not None:
                    updates.append("assets_discovered = %s")
                    params.append(assets_discovered)
                
                if assets_scanned is not None:
                    updates.append("assets_scanned = %s")
                    params.append(assets_scanned)

                if shadow_assets_found is not None:
                    updates.append("shadow_assets_found = %s")
                    params.append(shadow_assets_found)
                
                if current_stage:
                    updates.append("current_stage = %s")
                    params.append(current_stage)

                if updates:
                    query = f"UPDATE scan_jobs SET {', '.join(updates)} WHERE id = %s"
                    params.append(scan_id)
                    cur.execute(query, params)
            conn.commit()
    except Exception as e:
        log.error("sync_db_update_progress_failed", scan_id=scan_id, error=str(e))
        raise


def finalize_scan_sync(scan_id: str, organization_score: float, risk_counts: dict, shadow_assets_found: int) -> None:
    try:
        with get_sync_conn() as conn:
            with conn.cursor() as cur:
                # Count actual scanned assets from DB for accuracy
                cur.execute(
                    "SELECT COUNT(*) FROM scanned_assets WHERE scan_job_id = %s AND scan_status = 'COMPLETED'",
                    (scan_id,)
                )
                row = cur.fetchone()
                actual_scanned = row[0] if row else 0
                
                # Also count total discovered (including failed)
                cur.execute(
                    "SELECT COUNT(*) FROM scanned_assets WHERE scan_job_id = %s",
                    (scan_id,)
                )
                row2 = cur.fetchone()
                total_discovered = row2[0] if row2 else 0

                cur.execute(
                    """
                    UPDATE scan_jobs 
                    SET status = 'COMPLETED',
                        organization_score = %s,
                        critical_count = %s,
                        high_count = %s,
                        medium_count = %s,
                        low_count = %s,
                        safe_count = %s,
                        shadow_assets_found = %s,
                        assets_scanned = %s,
                        assets_discovered = %s,
                        completed_at = %s,
                        current_stage = 'complete'
                    WHERE id = %s
                    """,
                    (
                        organization_score,
                        risk_counts.get("CRITICAL", 0),
                        risk_counts.get("HIGH", 0),
                        risk_counts.get("MEDIUM", 0),
                        risk_counts.get("LOW", 0),
                        risk_counts.get("SAFE", 0),
                        shadow_assets_found,
                        actual_scanned,
                        total_discovered,
                        datetime.now(timezone.utc),
                        scan_id
                    )
                )
            conn.commit()
            log.info("finalize_scan_sync_ok", scan_id=scan_id, assets_scanned=actual_scanned, org_score=organization_score)
    except Exception as e:
        log.error("sync_db_finalize_scan_failed", scan_id=scan_id, error=str(e))
        raise


def create_asset_sync(scan_job_id: str, fqdn: str, asset_url: str, asset_type: str, port: int = 443, ip_address: str = None, is_shadow_asset: bool = False, discovery_method: str = "ct_log_mining") -> str:
    asset_id = str(uuid.uuid4())
    try:
        with get_sync_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO scanned_assets (id, scan_job_id, fqdn, asset_url, asset_type, port, ip_address, is_shadow_asset, discovery_method, scan_status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'PENDING')
                    """,
                    (asset_id, scan_job_id, fqdn, asset_url, asset_type, port, ip_address, is_shadow_asset, discovery_method)
                )
            conn.commit()
        return asset_id
    except Exception as e:
        log.error("sync_db_create_asset_failed", scan_id=scan_job_id, fqdn=fqdn, error=str(e))
        raise


def update_asset_scan_result_sync(asset_id: str, scan_data: dict) -> None:
    try:
        scan_data["scan_status"] = "COMPLETED"

        # Known DB columns on scanned_assets — skip anything else
        KNOWN_COLUMNS = {
            "scan_status", "scan_error",
            "tls_versions_supported", "tls_version_active", "cipher_suite_active",
            "cipher_suites_all", "key_exchange", "vulnerabilities",
            "cert_algorithm", "cert_key_length", "cert_expiry", "cert_expiry_days",
            "cert_issuer", "cert_subject", "cert_sha256", "cert_is_self_signed",
            "ocsp_stapling", "hsts_enabled", "hsts_max_age",
            "jwt_algorithm", "auth_type", "cors_policy", "graphql_introspection",
            "vpn_type",
            "ssh_host_key_algorithm", "ssh_kex_methods", "ssh_server_version",
            "ai_detections", "ai_fallback_used", "detection_sources",
            "quantum_safe_status", "quantum_exposure_score", "risk_level",
            "score_breakdown", "hndl_deadline", "hndl_urgency",
            "data_sensitivity_tier", "data_sensitivity_tier_source",
            "sensitivity_override_reason",
            "cbom_entry", "migration_plan", "pqc_certificate_id",
        }

        updates = []
        params = []
        for key, value in scan_data.items():
            if key not in KNOWN_COLUMNS:
                continue
            updates.append(f"{key} = %s")
            if isinstance(value, (dict, list)):
                params.append(json.dumps(value))
            elif hasattr(value, 'isoformat'):
                params.append(value.isoformat())
            else:
                params.append(value)

        if not updates:
            log.warning("update_asset_no_valid_columns", asset_id=asset_id)
            return

        params.append(asset_id)

        with get_sync_conn() as conn:
            with conn.cursor() as cur:
                query = f"UPDATE scanned_assets SET {', '.join(updates)} WHERE id = %s"
                cur.execute(query, params)
                rows_updated = cur.rowcount
            conn.commit()

        if rows_updated == 0:
            log.error("update_asset_no_rows_matched", asset_id=asset_id,
                      msg="UPDATE matched 0 rows — asset_id may not exist in DB")
        else:
            log.info("update_asset_scan_result_ok", asset_id=asset_id,
                     columns=len(updates), rows=rows_updated)

        log.info("update_asset_scan_result_ok", asset_id=asset_id, columns=len(updates))
    except Exception as e:
        log.error("sync_db_update_asset_failed", asset_id=asset_id, error=str(e))
        raise


def mark_asset_failed_sync(asset_id: str, error: str, status: str = "FAILED") -> None:
    try:
        with get_sync_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE scanned_assets SET scan_status = %s, scan_error = %s WHERE id = %s",
                    (status, str(error)[:500], asset_id)
                )
            conn.commit()
    except Exception as e:
        log.error("sync_db_mark_asset_failed_failed", asset_id=asset_id, error=str(e))
        raise


def create_certificate_sync(cert_data: dict) -> str:
    cert_id = str(uuid.uuid4())
    cert_data["id"] = cert_id
    
    try:
        columns = list(cert_data.keys())
        values = []
        for v in cert_data.values():
            if isinstance(v, (dict, list)):
                values.append(json.dumps(v))
            else:
                values.append(v)
                
        placeholders = ", ".join(["%s"] * len(columns))
        col_str = ", ".join(columns)
        
        with get_sync_conn() as conn:
            with conn.cursor() as cur:
                query = f"INSERT INTO pqc_certificates ({col_str}) VALUES ({placeholders})"
                cur.execute(query, values)
            conn.commit()
        return cert_id
    except Exception as e:
        log.error("sync_db_create_cert_failed", error=str(e))
        raise
