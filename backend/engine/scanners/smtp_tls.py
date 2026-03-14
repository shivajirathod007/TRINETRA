"""
TRINETRA — SMTP TLS Scanner
Checks email transport channel cryptographic configuration.
Banks send OTPs and statements via SMTP — HNDL-vulnerable if using
weak cipher suites on the mail transport layer.
"""

import asyncio
import smtplib
import socket
import ssl
from dataclasses import dataclass, field
from typing import Optional

from core.logging import get_logger

log = get_logger(__name__)

SMTP_TIMEOUT = 10.0


@dataclass
class SMTPTLSScanResult:
    hostname: str
    port: int
    starttls_supported: bool = False
    tls_version: Optional[str] = None
    cipher_suite: Optional[str] = None
    cert_algorithm: Optional[str] = None
    cert_expiry_days: Optional[int] = None
    mta_sts_enabled: bool = False
    quantum_vulnerable: Optional[bool] = None
    error: Optional[str] = None


class SMTPTLSScanner:
    """
    Tests SMTP STARTTLS and analyzes the resulting TLS connection.
    """

    def scan(self, hostname: str, port: int = 25) -> SMTPTLSScanResult:
        """
        Connects to SMTP, negotiates STARTTLS, inspects TLS parameters.
        Synchronous — run in executor.
        """
        result = SMTPTLSScanResult(hostname=hostname, port=port)

        try:
            with smtplib.SMTP(hostname, port, timeout=SMTP_TIMEOUT) as smtp:
                smtp.ehlo()

                # Check if STARTTLS is advertised
                if not smtp.has_extn("STARTTLS"):
                    result.starttls_supported = False
                    result.error = "STARTTLS not supported"
                    return result

                result.starttls_supported = True

                # Negotiate TLS
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                smtp.starttls(context=ctx)

                # Get connection details from the underlying socket
                sock = smtp.sock
                if isinstance(sock, ssl.SSLSocket):
                    cipher = sock.cipher()
                    if cipher:
                        result.cipher_suite = cipher[0]
                        result.tls_version = cipher[1]

                    # Get certificate
                    der = sock.getpeercert(binary_form=True)
                    if der:
                        pem = ssl.DER_cert_to_PEM_cert(der)
                        result.cert_algorithm, result.cert_expiry_days = (
                            self._parse_cert_basic(pem)
                        )

            # Quick quantum assessment
            cipher = result.cipher_suite or ""
            result.quantum_vulnerable = (
                "RSA" in cipher.upper() or
                "ECDHE" in cipher.upper() or
                "DHE" in cipher.upper()
            )

        except (smtplib.SMTPException, socket.timeout, ConnectionRefusedError) as e:
            result.error = str(e)[:200]
        except Exception as e:
            result.error = f"SMTP scan error: {str(e)[:200]}"

        log.info(
            "smtp_scan_complete",
            hostname=hostname,
            port=port,
            starttls=result.starttls_supported,
            tls_version=result.tls_version,
            quantum_vulnerable=result.quantum_vulnerable,
        )
        return result

    def _parse_cert_basic(self, pem: str) -> tuple[Optional[str], Optional[int]]:
        """Minimal cert parsing for SMTP context."""
        try:
            from cryptography import x509
            from cryptography.hazmat.backends import default_backend
            from datetime import datetime, timezone

            cert = x509.load_pem_x509_certificate(pem.encode(), default_backend())
            sig_alg = type(cert.public_key()).__name__.replace("PublicKey", "")
            days = (cert.not_valid_after_utc - datetime.now(timezone.utc)).days
            return sig_alg, max(days, 0)
        except Exception:
            return None, None
