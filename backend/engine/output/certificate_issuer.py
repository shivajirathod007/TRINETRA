"""
TRINETRA — PQC Certificate Issuer
Issues machine-verifiable, HMAC-signed PQC readiness certificates.

Three certificate tiers:
  QUANTUM_VULNERABLE  — Red    — classical crypto only
  PQC_READY           — Amber  — hybrid mode (classical + NIST PQC)
  FULLY_QUANTUM_SAFE  — Green  — 100% NIST PQC, no classical fallback

Certificates are JSON documents signed with TRINETRA's HMAC-SHA256 key.
Presentable to RBI auditors and compliance teams.
"""

from datetime import date, timedelta
from typing import Optional
import uuid

from core.constants import (
    CERT_TIER_VULNERABLE,
    CERT_TIER_READY,
    CERT_TIER_SAFE,
    CERT_TIER_COLORS,
    CERT_VALIDITY_DAYS,
    NIST_REFERENCES,
)
from core.security import sign_certificate, build_certificate_id, get_certificate_validity
from core.logging import get_logger
from engine.analysis.exposure_scorer import ExposureScoreResult

log = get_logger(__name__)

ISSUING_PLATFORM = "TRINETRA v1.0"
ISSUING_TEAM = "Team ZeroHour"


class CertificateIssuer:
    """
    Issues signed PQC readiness certificates for scanned assets.
    """

    def issue(
        self,
        asset_url: str,
        score_result: ExposureScoreResult,
        scan_id: str,
        key_exchange: Optional[str] = None,
        signature_algorithm: Optional[str] = None,
    ) -> dict:
        """
        Issues a PQC certificate for a single asset.

        Args:
            asset_url:           Full asset URL
            score_result:        Result from ExposureScorer
            scan_id:             Parent scan job ID
            key_exchange:        Detected KEX algorithm
            signature_algorithm: Detected signature algorithm

        Returns:
            Complete certificate dict (store in PQCCertificate.certificate_json)
        """
        tier = score_result.quantum_safe_status
        label = self._tier_to_label(tier)
        cert_id = build_certificate_id(asset_url, tier)
        issued_date, valid_until = get_certificate_validity()

        # Build NIST reference from detected algorithms
        nist_standard = self._find_nist_reference(
            key_exchange, signature_algorithm
        )

        # Build the certificate payload (without signature)
        payload = {
            "certificate_id": cert_id,
            "issuing_platform": ISSUING_PLATFORM,
            "issuing_team": ISSUING_TEAM,
            # Asset
            "asset_url": asset_url,
            "scan_id": scan_id,
            # Status
            "status": tier,
            "label": label,
            "color": CERT_TIER_COLORS.get(tier, "#888"),
            # Cryptographic details
            "algorithm_detected": score_result.algorithm,
            "key_exchange": key_exchange or "Not detected",
            "signature_algorithm": signature_algorithm or score_result.algorithm,
            "nist_standard": nist_standard,
            # Risk
            "quantum_exposure_score": score_result.score,
            "risk_level": score_result.risk_level,
            "hndl_deadline": score_result.hndl_deadline,
            # Validity
            "scan_date": issued_date,
            "issued_date": issued_date,
            "valid_until": valid_until,
            "validity_days": CERT_VALIDITY_DAYS,
        }

        # Sign the payload
        signature = sign_certificate(payload)
        payload["signature"] = signature

        log.info(
            "certificate_issued",
            cert_id=cert_id,
            asset_url=asset_url,
            tier=tier,
            score=score_result.score,
        )

        return {
            # Fields for PQCCertificate ORM model
            "certificate_id": cert_id,
            "asset_url": asset_url,
            "scan_job_id": scan_id,
            "status": tier,
            "label": label,
            "key_exchange": key_exchange,
            "signature_algorithm": signature_algorithm or score_result.algorithm,
            "nist_standard": nist_standard,
            "quantum_exposure_score": score_result.score,
            "issued_date": issued_date,
            "valid_until": valid_until,
            "signature": signature,
            "certificate_json": payload,
            "issuing_platform": ISSUING_PLATFORM,
        }

    def _tier_to_label(self, tier: str) -> str:
        labels = {
            CERT_TIER_VULNERABLE: "Quantum Vulnerable",
            CERT_TIER_READY:      "PQC Ready",
            CERT_TIER_SAFE:       "Fully Quantum Safe",
        }
        return labels.get(tier, "Unknown")

    def _find_nist_reference(
        self, kex: Optional[str], sig: Optional[str]
    ) -> str:
        """Returns appropriate NIST FIPS reference string."""
        combined = f"{kex or ''} {sig or ''}".upper()

        for algo_prefix, reference in NIST_REFERENCES.items():
            if algo_prefix.upper() in combined:
                return reference

        if "ML-KEM" in combined or "KYBER" in combined:
            return "NIST FIPS 203 (August 2024)"
        if "ML-DSA" in combined or "DILITHIUM" in combined:
            return "NIST FIPS 204 (August 2024)"
        if "SPHINCS" in combined or "SLH-DSA" in combined:
            return "NIST FIPS 205 (August 2024)"

        return "NIST FIPS 203/204/205 (August 2024)"
