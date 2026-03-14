"""
TRINETRA — SSH Probe
Extracts SSH host key algorithm and KEX methods via paramiko.
Validates against NIST SP 1800-38B scope for SSH endpoints.
"""

import socket
from dataclasses import dataclass, field
from typing import Optional

import paramiko
from paramiko.transport import Transport

from core.logging import get_logger

log = get_logger(__name__)

SSH_TIMEOUT = 10.0

# Quantum-vulnerable SSH host key types
VULNERABLE_HOST_KEYS = {"ssh-rsa", "ecdsa-sha2-nistp256", "ecdsa-sha2-nistp384", "ecdsa-sha2-nistp521"}
# Classically safe (not PQC-safe) host key types
CLASSICAL_SAFE_HOST_KEYS = {"ssh-ed25519", "ssh-ed448"}
# Quantum-vulnerable KEX methods
VULNERABLE_KEX = {
    "diffie-hellman-group14-sha256",
    "diffie-hellman-group14-sha1",
    "diffie-hellman-group1-sha1",
    "ecdh-sha2-nistp256",
    "ecdh-sha2-nistp384",
    "ecdh-sha2-nistp521",
}
# Hybrid PQC KEX (transitional)
HYBRID_KEX = {"sntrup761x25519-sha512@openssh.com", "x25519-kyber-512r3@ssh.com"}


@dataclass
class SSHScanResult:
    hostname: str
    port: int
    host_key_algorithm: Optional[str] = None
    host_key_bits: Optional[int] = None
    kex_methods: list[str] = field(default_factory=list)
    server_version: Optional[str] = None
    server_software: Optional[str] = None
    # Quantum assessment
    host_key_quantum_vulnerable: Optional[bool] = None
    kex_quantum_vulnerable: Optional[bool] = None
    has_hybrid_kex: bool = False
    quantum_safe_status: str = "UNKNOWN"
    # Error
    error: Optional[str] = None


class SSHProbe:
    """
    Extracts SSH cryptographic configuration via paramiko Transport.
    Runs synchronously — wrap in run_in_executor for async use.
    """

    def probe(self, hostname: str, port: int = 22) -> SSHScanResult:
        """
        Connects to SSH server, extracts host key and KEX info.
        Does NOT authenticate — key exchange only.
        """
        result = SSHScanResult(hostname=hostname, port=port)

        try:
            sock = socket.create_connection((hostname, port), timeout=SSH_TIMEOUT)
        except (socket.timeout, ConnectionRefusedError, OSError) as e:
            result.error = f"Connection failed: {str(e)[:100]}"
            return result

        try:
            transport = Transport(sock)
            transport.start_client(timeout=SSH_TIMEOUT)

            # ── Server version ────────────────────────────────────────────────
            remote_version = transport.remote_version or ""
            result.server_version = remote_version
            # Extract software name from "SSH-2.0-OpenSSH_8.9p1" format
            parts = remote_version.split("-")
            if len(parts) >= 3:
                result.server_software = "-".join(parts[2:])

            # ── Host key algorithm ────────────────────────────────────────────
            host_key = transport.get_remote_server_key()
            if host_key:
                result.host_key_algorithm = host_key.get_name()
                # Get key size for RSA keys
                if hasattr(host_key, "get_bits"):
                    result.host_key_bits = host_key.get_bits()

            # ── KEX methods ───────────────────────────────────────────────────
            # paramiko exposes negotiated KEX — get server's preferred list
            if hasattr(transport, "_preferred_kex"):
                result.kex_methods = list(transport._preferred_kex)
            elif hasattr(transport, "remote_kex_algorithms"):
                result.kex_methods = list(transport.remote_kex_algorithms or [])

            transport.close()

        except paramiko.SSHException as e:
            result.error = f"SSH negotiation failed: {str(e)[:200]}"
        except Exception as e:
            result.error = f"SSH probe error: {str(e)[:200]}"
        finally:
            try:
                sock.close()
            except Exception:
                pass

        # ── Quantum assessment ────────────────────────────────────────────────
        if result.host_key_algorithm:
            result.host_key_quantum_vulnerable = (
                result.host_key_algorithm in VULNERABLE_HOST_KEYS
            )

        if result.kex_methods:
            vulnerable_kex = [k for k in result.kex_methods if k in VULNERABLE_KEX]
            hybrid_kex = [k for k in result.kex_methods if k in HYBRID_KEX]
            result.kex_quantum_vulnerable = len(vulnerable_kex) > 0
            result.has_hybrid_kex = len(hybrid_kex) > 0

        # Overall status
        if result.error:
            result.quantum_safe_status = "SCAN_FAILED"
        elif result.host_key_quantum_vulnerable:
            result.quantum_safe_status = "VULNERABLE"
        elif result.has_hybrid_kex:
            result.quantum_safe_status = "PQC_READY"
        elif result.host_key_algorithm in CLASSICAL_SAFE_HOST_KEYS:
            result.quantum_safe_status = "CLASSICAL_SAFE"
        else:
            result.quantum_safe_status = "UNKNOWN"

        log.info(
            "ssh_probe_complete",
            hostname=hostname,
            host_key=result.host_key_algorithm,
            kex_count=len(result.kex_methods),
            status=result.quantum_safe_status,
        )
        return result
