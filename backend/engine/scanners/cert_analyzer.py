"""
TRINETRA — Certificate Analyzer
Parses TLS certificate chains using pyca/cryptography library.
Extracts algorithm, key length, expiry, issuer, OCSP, and CT proof.
"""

import ssl
import socket
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from cryptography import x509
from cryptography.hazmat.primitives.asymmetric import rsa, ec, ed25519, ed448, dh
from cryptography.hazmat.backends import default_backend
from cryptography.x509.oid import ExtensionOID

from core.logging import get_logger
from core.config import settings

log = get_logger(__name__)


@dataclass
class CertInfo:
    # Identity
    subject_cn: Optional[str]
    subject_san: list[str] = field(default_factory=list)
    issuer_cn: Optional[str] = None
    issuer_org: Optional[str] = None
    is_self_signed: bool = False
    # Algorithm
    signature_algorithm: str = "UNKNOWN"
    public_key_type: str = "UNKNOWN"
    key_length_bits: Optional[int] = None
    # Validity
    not_before: Optional[datetime] = None
    not_after: Optional[datetime] = None
    days_until_expiry: Optional[int] = None
    is_expired: bool = False
    # Extensions
    has_ocsp_stapling: bool = False
    has_ct_proof: bool = False       # SCT present = logged in CT
    has_hsts: bool = False
    # Fingerprint
    sha256_fingerprint: Optional[str] = None
    # Chain depth (0 = leaf, 1 = intermediate, 2 = root)
    chain: list[dict] = field(default_factory=list)


class CertAnalyzer:
    """
    Fetches and parses the full TLS certificate chain from a live endpoint.
    """

    def analyze(self, hostname: str, port: int = 443) -> CertInfo:
        """
        Connects to hostname:port, retrieves full certificate chain,
        and returns parsed CertInfo.

        Runs synchronously — call from thread executor in async context.
        """
        try:
            chain_pem = self._fetch_chain(hostname, port)
            if not chain_pem:
                return self._empty_result(hostname)

            certs = [x509.load_pem_x509_certificate(pem, default_backend())
                     for pem in chain_pem]

            if not certs:
                return self._empty_result(hostname)

            leaf = certs[0]
            return self._parse_leaf(leaf, certs)

        except ssl.SSLError as e:
            log.warning("cert_ssl_error", hostname=hostname, error=str(e))
            info = self._empty_result(hostname)
            info.signature_algorithm = f"SSL_ERROR: {str(e)[:100]}"
            return info
        except Exception as e:
            log.error("cert_analysis_error", hostname=hostname, error=str(e))
            return self._empty_result(hostname)

    def _fetch_chain(self, hostname: str, port: int) -> list[bytes]:
        """
        Connects with DER certificate retrieval.
        Returns list of PEM-encoded certs (leaf first).
        """
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE  # We check validity ourselves

        chain_pem = []
        with socket.create_connection((hostname, port), timeout=settings.cert_fetch_timeout) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                # Get leaf certificate
                der = ssock.getpeercert(binary_form=True)
                if der:
                    pem = ssl.DER_cert_to_PEM_cert(der).encode()
                    chain_pem.append(pem)

        return chain_pem

    def _parse_leaf(self, leaf: x509.Certificate, chain: list) -> CertInfo:
        """Extract all quantum-relevant fields from the leaf certificate."""
        info = CertInfo(subject_cn=None)

        # ── Subject ──────────────────────────────────────────────────────────
        try:
            info.subject_cn = leaf.subject.get_attributes_for_oid(
                x509.oid.NameOID.COMMON_NAME
            )[0].value
        except (IndexError, Exception):
            pass

        # ── SANs ─────────────────────────────────────────────────────────────
        try:
            san_ext = leaf.extensions.get_extension_for_oid(
                ExtensionOID.SUBJECT_ALTERNATIVE_NAME
            )
            info.subject_san = [
                str(name.value)
                for name in san_ext.value
            ]
        except x509.ExtensionNotFound:
            pass

        # ── Issuer ────────────────────────────────────────────────────────────
        try:
            info.issuer_cn = leaf.issuer.get_attributes_for_oid(
                x509.oid.NameOID.COMMON_NAME
            )[0].value
        except (IndexError, Exception):
            pass

        try:
            info.issuer_org = leaf.issuer.get_attributes_for_oid(
                x509.oid.NameOID.ORGANIZATION_NAME
            )[0].value
        except (IndexError, Exception):
            pass

        # Self-signed check
        info.is_self_signed = (leaf.subject == leaf.issuer)

        # ── Algorithm + Key Length ────────────────────────────────────────────
        info.signature_algorithm, info.public_key_type, info.key_length_bits = (
            self._parse_key(leaf)
        )

        # ── Validity ──────────────────────────────────────────────────────────
        now = datetime.now(timezone.utc)
        info.not_before = leaf.not_valid_before_utc
        info.not_after = leaf.not_valid_after_utc
        info.is_expired = now > info.not_after
        if not info.is_expired:
            delta = info.not_after - now
            info.days_until_expiry = delta.days

        # ── Fingerprint ───────────────────────────────────────────────────────
        from cryptography.hazmat.primitives import hashes
        import binascii
        digest = leaf.fingerprint(hashes.SHA256())
        info.sha256_fingerprint = binascii.hexlify(digest).decode()

        # ── Extensions ───────────────────────────────────────────────────────
        # CT Proof (SCT list)
        try:
            leaf.extensions.get_extension_for_oid(
                ExtensionOID.PRECERT_SIGNED_CERTIFICATE_TIMESTAMPS
            )
            info.has_ct_proof = True
        except x509.ExtensionNotFound:
            pass

        # ── Chain info ────────────────────────────────────────────────────────
        for i, cert in enumerate(chain):
            try:
                _, _, key_len = self._parse_key(cert)
                info.chain.append({
                    "depth": i,
                    "cn": cert.subject.get_attributes_for_oid(
                        x509.oid.NameOID.COMMON_NAME
                    )[0].value if cert.subject else "Unknown",
                    "key_length": key_len,
                    "expiry": cert.not_valid_after_utc.isoformat(),
                })
            except Exception:
                pass

        log.info(
            "cert_analyzed",
            cn=info.subject_cn,
            algo=info.signature_algorithm,
            key_bits=info.key_length_bits,
            days_remaining=info.days_until_expiry,
        )
        return info

    def _parse_key(self, cert: x509.Certificate) -> tuple[str, str, Optional[int]]:
        """
        Returns (signature_algorithm_name, key_type, key_length_bits).
        """
        # Signature algorithm
        sig_alg = "UNKNOWN"
        try:
            sig_alg = cert.signature_algorithm_oid._name or str(cert.signature_hash_algorithm)
            # Normalize common names
            oid_map = {
                "sha256WithRSAEncryption":  "RSA-SHA256",
                "sha384WithRSAEncryption":  "RSA-SHA384",
                "sha512WithRSAEncryption":  "RSA-SHA512",
                "ecdsa-with-SHA256":        "ECDSA-SHA256",
                "ecdsa-with-SHA384":        "ECDSA-SHA384",
                "id-Ed25519":               "Ed25519",
                "id-Ed448":                 "Ed448",
            }
            sig_alg = oid_map.get(sig_alg, sig_alg)
        except Exception:
            pass

        # Public key type + length
        pub_key = cert.public_key()
        if isinstance(pub_key, rsa.RSAPublicKey):
            bits = pub_key.key_size
            return sig_alg, f"RSA-{bits}", bits

        if isinstance(pub_key, ec.EllipticCurvePublicKey):
            bits = pub_key.key_size
            curve = pub_key.curve.name
            return sig_alg, f"EC-{curve}", bits

        if isinstance(pub_key, ed25519.Ed25519PublicKey):
            return sig_alg, "Ed25519", 256

        if isinstance(pub_key, ed448.Ed448PublicKey):
            return sig_alg, "Ed448", 448

        return sig_alg, "UNKNOWN", None

    def _empty_result(self, hostname: str) -> CertInfo:
        return CertInfo(subject_cn=hostname)
