"""
TRINETRA — TLS Scanner
Full TLS analysis using SSLyze.
Extracts every field needed for quantum exposure assessment:
protocol versions, cipher suites, key exchange, classical vulnerabilities.
"""

import asyncio
from dataclasses import dataclass, field
from typing import Optional

from sslyze import (
    Scanner,
    ServerNetworkLocation,
    ServerScanRequest,
    ScanCommand,
)
from sslyze.errors import (
    ConnectionToServerFailed,
    ServerHostnameCouldNotBeResolved,
)
from core.constants import DEPRECATED_TLS_VERSIONS
from core.exceptions import TLSScanError, ScanBlockedError
from core.logging import get_logger

log = get_logger(__name__)

# Commands that matter for quantum assessment — keep minimal for speed.
# Vulnerability checks (ROBOT, HEARTBLEED, CCS, RENEGOTIATION) are slow
# and not needed for PQC scoring. Run only cipher/version + cert.
SCAN_COMMANDS = {
    ScanCommand.TLS_1_2_CIPHER_SUITES,
    ScanCommand.TLS_1_3_CIPHER_SUITES,
    ScanCommand.CERTIFICATE_INFO,
}

# Full command set used only when deep_scan=True
SCAN_COMMANDS_DEEP = {
    ScanCommand.SSL_2_0_CIPHER_SUITES,
    ScanCommand.SSL_3_0_CIPHER_SUITES,
    ScanCommand.TLS_1_0_CIPHER_SUITES,
    ScanCommand.TLS_1_1_CIPHER_SUITES,
    ScanCommand.TLS_1_2_CIPHER_SUITES,
    ScanCommand.TLS_1_3_CIPHER_SUITES,
    ScanCommand.CERTIFICATE_INFO,
    ScanCommand.ROBOT,
    ScanCommand.HEARTBLEED,
    ScanCommand.TLS_COMPRESSION,
    ScanCommand.TLS_FALLBACK_SCSV,
    ScanCommand.OPENSSL_CCS_INJECTION,
    ScanCommand.SESSION_RENEGOTIATION,
}

VERSION_COMMAND_MAP = {
    "SSL_2_0":  ScanCommand.SSL_2_0_CIPHER_SUITES,
    "SSL_3_0":  ScanCommand.SSL_3_0_CIPHER_SUITES,
    "TLS_1_0":  ScanCommand.TLS_1_0_CIPHER_SUITES,
    "TLS_1_1":  ScanCommand.TLS_1_1_CIPHER_SUITES,
    "TLS_1_2":  ScanCommand.TLS_1_2_CIPHER_SUITES,
    "TLS_1_3":  ScanCommand.TLS_1_3_CIPHER_SUITES,
}


@dataclass
class TLSScanResult:
    hostname: str
    port: int
    # Protocol versions
    supported_versions: list[str] = field(default_factory=list)
    deprecated_versions: list[str] = field(default_factory=list)
    highest_version: Optional[str] = None
    # Cipher suites per version
    cipher_suites: dict[str, list[str]] = field(default_factory=dict)
    active_cipher_suite: Optional[str] = None
    # Key exchange
    key_exchange: str = "UNKNOWN"
    # Classical vulnerabilities
    vulnerabilities: list[str] = field(default_factory=list)
    # TLS config issues
    tls_compression_enabled: bool = False
    insecure_renegotiation: bool = False
    # Status
    scan_blocked: bool = False
    error: Optional[str] = None


class TLSScanner:
    """
    Wraps SSLyze for quantum-focused TLS scanning.
    SSLyze is synchronous internally — runs in thread executor
    to avoid blocking the async event loop.
    """

    async def scan(self, hostname: str, port: int = 443, deep: bool = False) -> TLSScanResult:
        """
        Runs TLS scan on hostname:port.
        deep=False (default): fast mode — TLS 1.2/1.3 + cert only (~2-4s per host)
        deep=True: full vulnerability scan — all protocol versions + vuln checks
        Never raises — errors are captured in result.error.
        """
        try:
            loop = asyncio.get_event_loop()
            raw_result = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    self._run_sslyze_sync,
                    hostname,
                    port,
                    deep,
                ),
                timeout=30.0,  # Hard 30s cap per host — SSLyze can hang on firewalled hosts
            )
            return self._normalize(raw_result, hostname, port)

        except asyncio.TimeoutError:
            log.warning("tls_scan_timeout", hostname=hostname, port=port)
            result = TLSScanResult(hostname=hostname, port=port)
            result.error = "TLS scan timed out after 30s"
            return result

        except ServerHostnameCouldNotBeResolved as e:
            log.warning("tls_scan_hostname_error", hostname=hostname, error=str(e))
            result = TLSScanResult(hostname=hostname, port=port)
            result.error = f"Hostname could not be resolved: {e}"
            return result

        except ConnectionToServerFailed as e:
            log.warning("tls_scan_connection_failed", hostname=hostname, error=str(e))
            result = TLSScanResult(hostname=hostname, port=port)
            result.scan_blocked = True
            result.error = f"Connection failed (WAF/firewall may be blocking scanner): {e}"
            return result

        except Exception as e:
            log.error("tls_scan_unexpected_error", hostname=hostname, error=str(e))
            result = TLSScanResult(hostname=hostname, port=port)
            result.error = str(e)[:500]
            return result

    def _run_sslyze_sync(self, hostname: str, port: int, deep: bool = False):
        """
        SSLyze synchronous scan — runs in thread executor.
        Returns raw SSLyze ServerScanResult.
        """
        commands = SCAN_COMMANDS_DEEP if deep else SCAN_COMMANDS
        location = ServerNetworkLocation(hostname, port)
        request = ServerScanRequest(
            server_location=location,
            scan_commands=commands,
        )
        scanner = Scanner()
        scanner.queue_scans([request])
        for result in scanner.get_results():
            return result  # Only one result
        return None

    def _normalize(self, raw, hostname: str, port: int) -> TLSScanResult:
        """Extract quantum-relevant fields from SSLyze raw result."""
        result = TLSScanResult(hostname=hostname, port=port)

        if raw is None:
            result.error = "No result returned from SSLyze"
            return result

        # Check for connectivity error
        if raw.connectivity_error_trace:
            result.scan_blocked = True
            result.error = "Scanner blocked or connection refused"
            return result

        # ── Protocol versions + cipher suites ─────────────────────────────────
        for version_name, cmd in VERSION_COMMAND_MAP.items():
            attempt = getattr(raw.scan_result, cmd.name.lower(), None)
            if not attempt or attempt.status.name != "COMPLETED":
                continue

            accepted = attempt.result.accepted_cipher_suites
            if not accepted:
                continue

            result.supported_versions.append(version_name)
            result.cipher_suites[version_name] = [
                cs.cipher_suite.name for cs in accepted
            ]

            if version_name in DEPRECATED_TLS_VERSIONS:
                result.deprecated_versions.append(version_name)

        # Highest supported version
        version_priority = ["TLS_1_3", "TLS_1_2", "TLS_1_1", "TLS_1_0", "SSL_3_0", "SSL_2_0"]
        for v in version_priority:
            if v in result.supported_versions:
                result.highest_version = v
                break

        # Active cipher suite = preferred cipher of highest version
        if result.highest_version and result.cipher_suites.get(result.highest_version):
            result.active_cipher_suite = result.cipher_suites[result.highest_version][0]

        # ── Key exchange ──────────────────────────────────────────────────────
        result.key_exchange = self._extract_kex(result.cipher_suites)

        # ── Classical vulnerabilities ─────────────────────────────────────────
        vuln_checks = {
            "ROBOT": ScanCommand.ROBOT,
            "HEARTBLEED": ScanCommand.HEARTBLEED,
            "OPENSSL_CCS": ScanCommand.OPENSSL_CCS_INJECTION,
        }
        for vuln_name, cmd in vuln_checks.items():
            attempt = getattr(raw.scan_result, cmd.name.lower(), None)
            if not attempt or attempt.status.name != "COMPLETED":
                continue
            try:
                is_vulnerable = getattr(attempt.result, "is_vulnerable_to_robot", False) or \
                                getattr(attempt.result, "is_vulnerable_to_heartbleed", False) or \
                                getattr(attempt.result, "is_vulnerable_to_ccs_injection", False)
                if is_vulnerable:
                    result.vulnerabilities.append(vuln_name)
            except AttributeError:
                pass

        # ── TLS config issues ──────────────────────────────────────────────────
        comp_attempt = getattr(raw.scan_result, ScanCommand.TLS_COMPRESSION.name.lower(), None)
        if comp_attempt and comp_attempt.status.name == "COMPLETED":
            result.tls_compression_enabled = getattr(
                comp_attempt.result, "supports_compression", False
            )

        reneg_attempt = getattr(raw.scan_result, ScanCommand.SESSION_RENEGOTIATION.name.lower(), None)
        if reneg_attempt and reneg_attempt.status.name == "COMPLETED":
            result.insecure_renegotiation = getattr(
                reneg_attempt.result, "supports_insecure_renegotiation", False
            )

        log.info(
            "tls_scan_complete",
            hostname=hostname,
            versions=result.supported_versions,
            kex=result.key_exchange,
            vulns=result.vulnerabilities,
        )
        return result

    def _extract_kex(self, cipher_suites: dict[str, list[str]]) -> str:
        """
        Determines dominant key exchange from cipher suite names.
        Priority: check highest TLS version first.
        """
        # TLS 1.3 logic — Key exchange is negotiated separately and is always (EC)DHE.
        # The cipher suite names (e.g. TLS_AES_128_GCM_SHA256) don't contain KEX info.
        if "TLS_1_3" in cipher_suites:
            return "ECDH/DHE (TLS 1.3)"

        priority_versions = ["TLS_1_2", "TLS_1_1", "TLS_1_0"]
        for version in priority_versions:
            suites = cipher_suites.get(version, [])
            for suite in suites:
                su = suite.upper()
                if "KYBER" in su or "ML-KEM" in su:
                    return "ML-KEM-768"     # PQC key exchange
                if "X25519KYBER" in su:
                    return "KYBER_HYBRID"   # Hybrid mode
                if "ECDHE" in su:
                    return "ECDHE"          # Forward-secret, quantum-vulnerable
                if "DHE" in su:
                    return "DHE"
                if "RSA" in su and "_WITH_" in su:
                    # If it's pure RSA (not ECDHE_RSA or DHE_RSA), it's the weak static KEX
                    if not any(fs in su for fs in ["ECDHE", "DHE"]):
                        return "RSA_KEX"
        return "UNKNOWN"
