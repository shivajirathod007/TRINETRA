"""
TRINETRA — CBOM Generator
Generates Cryptographic Bill of Materials in CycloneDX 1.6 JSON format.
One CBOM entry per scanned asset. Organization-level CBOM aggregates all assets.

Research basis:
  - IBM CBOM Specification (Vassilev et al., 2022)
  - OWASP CycloneDX 1.6 schema (cryptoProperties component)
  - NIST SP 1800-38B (2023): Cryptographic Discovery guidance
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from core.logging import get_logger
from engine.analysis.exposure_scorer import ExposureScoreResult
from engine.analysis.hndl_engine import HNDLRiskResult
from engine.scanners.tls_scanner import TLSScanResult
from engine.scanners.cert_analyzer import CertInfo
from engine.scanners.api_inspector import APIInspectResult
from engine.scanners.ssh_probe import SSHScanResult
from engine.discovery.asset_classifier import ClassifiedAsset

log = get_logger(__name__)

TRINETRA_VERSION = "TRINETRA v1.0"
CYCLONEDX_SCHEMA = "http://cyclonedx.org/schema/bom/1.6"


class CBOMGenerator:
    """
    Generates CycloneDX 1.6-compliant CBOM entries.
    """

    def generate_asset_entry(
        self,
        asset: ClassifiedAsset,
        tls_result: Optional[TLSScanResult],
        cert_info: Optional[CertInfo],
        api_result: Optional[APIInspectResult],
        ssh_result: Optional[SSHScanResult],
        score_result: ExposureScoreResult,
        hndl_result: HNDLRiskResult,
        scan_id: str,
        pqc_certificate_id: Optional[str] = None,
        ai_detections: Optional[list] = None,
        data_sensitivity_tier: str = "static",
        data_sensitivity_tier_source: str = "auto_detected",
        data_shelf_life_years: float = 0.0,
    ) -> dict[str, Any]:
        """
        Builds a complete CycloneDX 1.6 CBOM entry for one asset.
        This dict is stored in ScannedAsset.cbom_entry column.
        """
        now = datetime.now(timezone.utc).isoformat()

        entry: dict[str, Any] = {
            # ── CycloneDX metadata ────────────────────────────────────────────
            "bomFormat": "CycloneDX",
            "specVersion": "1.6",
            "serialNumber": f"urn:uuid:{uuid.uuid4()}",
            "version": 1,
            "metadata": {
                "timestamp": now,
                "tools": [{"vendor": "ZeroHour", "name": "TRINETRA", "version": "1.0"}],
                "component": {
                    "type": "library",
                    "name": asset.fqdn,
                    "version": "scanned",
                },
            },

            # ── Asset identity ────────────────────────────────────────────────
            "asset": {
                "url": asset.asset_url,
                "fqdn": asset.fqdn,
                "ip_address": asset.ip_address,
                "port": asset.port,
                "type": asset.asset_type,
                "is_shadow_asset": asset.is_shadow_asset,
                "discovery_method": "ct_log_mining",
            },

            # ── TLS configuration ─────────────────────────────────────────────
            "tls": self._build_tls_section(tls_result),

            # ── Certificate ───────────────────────────────────────────────────
            "certificate": self._build_cert_section(cert_info),

            # ── API findings ──────────────────────────────────────────────────
            "api": self._build_api_section(api_result),

            # ── SSH findings ──────────────────────────────────────────────────
            "ssh": self._build_ssh_section(ssh_result),

            # ── AI detections ─────────────────────────────────────────────────
            "ai_detections": ai_detections or [],

            # ── Detection sources ─────────────────────────────────────────────
            "detection_sources": self._list_detection_sources(
                tls_result, cert_info, api_result, ssh_result, ai_detections
            ),

            # ── Quantum risk assessment ───────────────────────────────────────
            "quantum_risk": {
                "quantum_safe_status": score_result.quantum_safe_status,
                "quantum_exposure_score": score_result.score,
                "risk_level": score_result.risk_level,
                "primary_algorithm": score_result.algorithm,
                "score_breakdown": {
                    "algorithm_risk": score_result.breakdown.algorithm_risk_raw,
                    "hndl_timeline": score_result.breakdown.hndl_timeline_raw,
                    "public_exposure": score_result.breakdown.public_exposure_raw,
                    "weights": score_result.breakdown.weights,
                    "data_sensitivity_tier": score_result.breakdown.data_sensitivity_tier,
                    "data_shelf_life_years": score_result.breakdown.data_shelf_life_years,
                    "sensitivity_tier_impact": score_result.breakdown.sensitivity_tier_impact,
                    "formula": "Score = (AlgRisk×0.40) + (HNDLTimeline[sensitivity-adjusted]×0.40) + (Exposure×0.20)",
                    "research_basis": "QARS formula — MDPI Electronics, August 2025",
                },
            },

            # ── HNDL assessment ───────────────────────────────────────────────
            "hndl": {
                "hndl_active": hndl_result.hndl_active,
                "primary_deadline": hndl_result.primary_deadline,
                "deadline_pessimistic": hndl_result.deadline_pessimistic,
                "deadline_moderate": hndl_result.deadline_moderate,
                "deadline_optimistic": hndl_result.deadline_optimistic,
                "urgency_level": hndl_result.urgency_level,
                "urgency_message": hndl_result.urgency_message,
                "data_decryptable_in_years": hndl_result.data_decryptable_in_years,
                "data_sensitivity_tier": data_sensitivity_tier,
                "data_sensitivity_tier_source": data_sensitivity_tier_source,
                "data_shelf_life_years": data_shelf_life_years,
                "mosca": {
                    "act_now": hndl_result.mosca_act_now,
                    "x_data_shelf_life_years": hndl_result.mosca_x,
                    "y_migration_time_years": hndl_result.mosca_y,
                    "z_years_to_crqc": hndl_result.mosca_z,
                    "research_basis": "Mosca's Theorem — Michele Mosca, 2018",
                },
                "crqc_scenarios": {
                    "pessimistic": hndl_result.crqc_year_pessimistic,
                    "moderate": hndl_result.crqc_year_moderate,
                    "optimistic": hndl_result.crqc_year_optimistic,
                },
            },

            # ── NIST compliance ───────────────────────────────────────────────
            "nist": {
                "recommendation": score_result.nist_recommendation,
                "fips_203": "ML-KEM (Kyber) — Key Encapsulation",
                "fips_204": "ML-DSA (Dilithium) — Digital Signatures",
                "fips_205": "SLH-DSA (SPHINCS+) — Hash-based Signatures",
                "finalized": "August 2024",
            },

            # ── PQC certificate reference ─────────────────────────────────────
            "pqc_certificate_id": pqc_certificate_id,

            # ── Scan metadata ─────────────────────────────────────────────────
            "scan": {
                "scan_id": scan_id,
                "scan_timestamp": now,
                "issuing_platform": TRINETRA_VERSION,
            },
        }

        return entry

    def generate_organization_cbom(
        self,
        domain: str,
        scan_id: str,
        asset_entries: list[dict],
        organization_score: float,
    ) -> dict[str, Any]:
        """
        Aggregates all per-asset CBOM entries into an organization-level CBOM.
        This is the exportable document delivered to the bank.
        """
        now = datetime.now(timezone.utc).isoformat()

        risk_counts = self._count_risk_tiers(asset_entries)

        return {
            "bomFormat": "CycloneDX",
            "specVersion": "1.6",
            "serialNumber": f"urn:uuid:{uuid.uuid4()}",
            "version": 1,
            "metadata": {
                "timestamp": now,
                "tools": [{"vendor": "ZeroHour", "name": "TRINETRA", "version": "1.0"}],
                "subject": {
                    "domain": domain,
                    "scan_id": scan_id,
                    "total_assets": len(asset_entries),
                },
            },
            "organization_summary": {
                "domain": domain,
                "organization_quantum_exposure_score": organization_score,
                "total_assets_scanned": len(asset_entries),
                "risk_distribution": risk_counts,
                "sensitivity_distribution": self._count_sensitivity_tiers(asset_entries),
                "shadow_assets_found": sum(
                    1 for e in asset_entries
                    if e.get("asset", {}).get("is_shadow_asset", False)
                ),
                "hndl_active_assets": sum(
                    1 for e in asset_entries
                    if e.get("hndl", {}).get("hndl_active", False)
                ),
                "pqc_ready_assets": sum(
                    1 for e in asset_entries
                    if e.get("quantum_risk", {}).get("quantum_safe_status") in
                    ["PQC_READY", "FULLY_QUANTUM_SAFE"]
                ),
            },
            "components": asset_entries,
            "nist_reference": {
                "sp_1800_38b": "Migration to Post-Quantum Cryptography — December 2023",
                "fips_203": "NIST FIPS 203 — ML-KEM (August 2024)",
                "fips_204": "NIST FIPS 204 — ML-DSA (August 2024)",
                "fips_205": "NIST FIPS 205 — SLH-DSA (August 2024)",
            },
        }

    # ── Section builders ──────────────────────────────────────────────────────

    def _build_tls_section(self, r: Optional[TLSScanResult]) -> dict:
        if not r:
            return {"status": "not_scanned"}
        return {
            "supported_versions": r.supported_versions,
            "deprecated_versions": r.deprecated_versions,
            "highest_version": r.highest_version,
            "active_cipher_suite": r.active_cipher_suite,
            "cipher_suites_all": r.cipher_suites,
            "key_exchange": r.key_exchange,
            "vulnerabilities": r.vulnerabilities,
            "tls_compression": r.tls_compression_enabled,
            "insecure_renegotiation": r.insecure_renegotiation,
            "scan_blocked": r.scan_blocked,
        }

    def _build_cert_section(self, c: Optional[CertInfo]) -> dict:
        if not c:
            return {"status": "not_scanned"}
        return {
            "subject_cn": c.subject_cn,
            "subject_san": c.subject_san,
            "issuer_cn": c.issuer_cn,
            "issuer_org": c.issuer_org,
            "is_self_signed": c.is_self_signed,
            "signature_algorithm": c.signature_algorithm,
            "public_key_type": c.public_key_type,
            "key_length_bits": c.key_length_bits,
            "not_before": c.not_before.isoformat() if c.not_before else None,
            "not_after": c.not_after.isoformat() if c.not_after else None,
            "days_until_expiry": c.days_until_expiry,
            "is_expired": c.is_expired,
            "has_ocsp_stapling": c.has_ocsp_stapling,
            "has_ct_proof": c.has_ct_proof,
            "sha256_fingerprint": c.sha256_fingerprint,
            "chain": c.chain,
        }

    def _build_api_section(self, a: Optional[APIInspectResult]) -> dict:
        if not a:
            return {"status": "not_scanned"}
        return {
            "jwt_algorithm": a.jwt_algorithm,
            "jwt_quantum_safe": a.jwt_quantum_safe,
            "jwt_location": a.jwt_location,
            "auth_type": a.auth_type,
            "www_authenticate": a.www_authenticate,
            "hsts_enabled": a.hsts_enabled,
            "hsts_max_age": a.hsts_max_age,
            "csp_present": a.csp_present,
            "security_headers_missing": a.security_headers_missing,
            "cors_policy": a.cors_policy,
            "graphql_introspection": a.graphql_introspection,
            "endpoints_scanned": a.endpoints_scanned,
            "findings": a.findings,
        }

    def _build_ssh_section(self, s: Optional[SSHScanResult]) -> dict:
        if not s:
            return {"status": "not_scanned"}
        return {
            "host_key_algorithm": s.host_key_algorithm,
            "host_key_bits": s.host_key_bits,
            "kex_methods": s.kex_methods,
            "server_version": s.server_version,
            "quantum_vulnerable": s.host_key_quantum_vulnerable,
            "has_hybrid_kex": s.has_hybrid_kex,
            "quantum_safe_status": s.quantum_safe_status,
        }

    def _list_detection_sources(self, tls, cert, api, ssh, ai) -> list[str]:
        sources = []
        if tls and not tls.error:
            sources.append("tls_scanner")
        if cert and cert.signature_algorithm != "UNKNOWN":
            sources.append("cert_analyzer")
        if api and not api.error:
            sources.append("api_inspector")
        if ssh and not ssh.error:
            sources.append("ssh_probe")
        if ai:
            sources.append("ai_classifier")
        return sources

    def _count_risk_tiers(self, entries: list[dict]) -> dict:
        counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "SAFE": 0}
        for e in entries:
            tier = e.get("quantum_risk", {}).get("risk_level", "UNKNOWN")
            if tier in counts:
                counts[tier] += 1
        return counts

    def _count_sensitivity_tiers(self, entries: list[dict]) -> dict:
        """Counts assets per data_sensitivity_tier for org-level CBOM summary."""
        counts = {"transaction": 0, "authentication": 0, "static": 0}
        for e in entries:
            tier = e.get("hndl", {}).get("data_sensitivity_tier", "static")
            if tier in counts:
                counts[tier] += 1
            else:
                counts["static"] += 1
        return counts
