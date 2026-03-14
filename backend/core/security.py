"""
TRINETRA — Certificate Security
HMAC-SHA256 signing for PQC readiness certificates.
Every issued certificate is tamper-evident.
"""

import hashlib
import hmac
import json
from datetime import date, timedelta
from typing import Any
from uuid import uuid4

from core.config import settings
from core.constants import CERT_VALIDITY_DAYS


def _get_signing_key() -> bytes:
    return settings.certificate_signing_key.encode("utf-8")


def sign_certificate(payload: dict[str, Any]) -> str:
    """
    Creates an HMAC-SHA256 signature over the canonical JSON of the certificate.
    The payload dict must NOT include the 'signature' key before calling this.
    Returns hex-encoded signature string.
    """
    # Canonical JSON: sorted keys, no whitespace (deterministic)
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    signature = hmac.new(
        _get_signing_key(),
        canonical.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return signature


def verify_certificate(payload: dict[str, Any], signature: str) -> bool:
    """
    Verifies a certificate signature.
    Returns True if the signature is valid, False otherwise.
    """
    payload_without_sig = {k: v for k, v in payload.items() if k != "signature"}
    expected = sign_certificate(payload_without_sig)
    return hmac.compare_digest(expected, signature)


def build_certificate_id(domain: str, asset_type: str) -> str:
    """
    Generates a human-readable certificate ID.
    Format: TRN-YYYY-XXXX-TIER
    Example: TRN-2026-0847-VULN
    """
    short = str(uuid4())[:4].upper()
    year = date.today().year
    return f"TRN-{year}-{short}"


def get_certificate_validity() -> tuple[str, str]:
    """Returns (issued_date, valid_until) as ISO 8601 strings."""
    today = date.today()
    expiry = today + timedelta(days=CERT_VALIDITY_DAYS)
    return today.isoformat(), expiry.isoformat()
