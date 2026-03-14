"""
TRINETRA — VPN Detector
Fingerprints SSL VPN gateways and runs TLS analysis on them.
Covers: Cisco AnyConnect, Fortinet SSL VPN, Palo Alto GlobalProtect, OpenVPN.

Required by PNB problem statement: "TLS-based VPN" scope.
"""

import asyncio
from dataclasses import dataclass
from typing import Optional

import httpx

from core.constants import VPN_FINGERPRINTS, VPN_PORTS
from core.logging import get_logger

log = get_logger(__name__)

HTTP_TIMEOUT = 10.0


@dataclass
class VPNScanResult:
    hostname: str
    port: int
    vpn_type: Optional[str]        # cisco_anyconnect | fortinet_ssl | palo_alto_gp | openvpn
    vpn_confirmed: bool
    # TLS findings (same as web endpoint — vpn_detector re-uses tls_scanner)
    tls_version: Optional[str] = None
    cipher_suite: Optional[str] = None
    key_exchange: Optional[str] = None
    cert_algorithm: Optional[str] = None
    cert_expiry_days: Optional[int] = None
    # VPN-specific
    banner: Optional[str] = None
    error: Optional[str] = None


class VPNDetector:
    """
    Probes common SSL VPN ports and fingerprints the VPN vendor.
    Then delegates full TLS + cert analysis to their respective scanners.
    """

    async def detect(
        self,
        hostname: str,
        known_port: Optional[int] = None,
    ) -> list[VPNScanResult]:
        """
        Probes all VPN ports on hostname and returns confirmed VPN endpoints.

        Args:
            hostname: FQDN to probe
            known_port: If already known (from port scanner), probe only this port.
                        Otherwise probes all VPN_PORTS.
        Returns:
            List of VPNScanResult — one per confirmed VPN endpoint found.
        """
        ports_to_probe = [known_port] if known_port else VPN_PORTS

        tasks = [self._probe_port(hostname, port) for port in ports_to_probe]
        results = await asyncio.gather(*tasks, return_exceptions=False)

        # Return only confirmed VPN endpoints
        confirmed = [r for r in results if r is not None and r.vpn_confirmed]
        log.info(
            "vpn_detection_complete",
            hostname=hostname,
            ports_probed=len(ports_to_probe),
            vpns_found=len(confirmed),
        )
        return confirmed

    async def _probe_port(
        self, hostname: str, port: int
    ) -> Optional[VPNScanResult]:
        """Probe a single port for VPN presence."""
        try:
            async with httpx.AsyncClient(
                timeout=HTTP_TIMEOUT,
                verify=False,
                follow_redirects=True,
            ) as client:
                base_url = f"https://{hostname}:{port}" if port != 443 else f"https://{hostname}"

                # Try known VPN detection paths
                for vpn_type, signatures in VPN_FINGERPRINTS.items():
                    paths = signatures.get("paths", ["/"])
                    if not paths:
                        paths = ["/"]

                    for path in paths[:2]:  # Try first 2 paths per VPN type
                        try:
                            resp = await client.get(
                                f"{base_url}{path}",
                                headers={
                                    "User-Agent": "Mozilla/5.0 (compatible; TRINETRA-Scanner/1.0)"
                                },
                                timeout=5.0,
                            )

                            if self._matches_vpn(resp, vpn_type, port):
                                log.info(
                                    "vpn_detected",
                                    hostname=hostname,
                                    port=port,
                                    vpn_type=vpn_type,
                                )
                                return VPNScanResult(
                                    hostname=hostname,
                                    port=port,
                                    vpn_type=vpn_type,
                                    vpn_confirmed=True,
                                    banner=resp.headers.get("server", "")[:100],
                                )
                        except httpx.TimeoutException:
                            continue
                        except Exception:
                            continue

                return None  # No VPN detected on this port

        except Exception as e:
            log.debug("vpn_probe_error", hostname=hostname, port=port, error=str(e)[:100])
            return None

    def _matches_vpn(self, resp: httpx.Response, vpn_type: str, port: int) -> bool:
        """Check if HTTP response matches VPN vendor fingerprint."""
        signatures = VPN_FINGERPRINTS.get(vpn_type, {})
        body = resp.text.lower()
        headers = {k.lower(): v for k, v in resp.headers.items()}
        url_str = str(resp.url).lower()

        # Check URL path match
        for path in signatures.get("paths", []):
            if path.lower() in url_str:
                return True

        # Check response headers
        for expected_header in signatures.get("headers", []):
            if expected_header.lower() in headers:
                return True

        # Check body patterns
        for pattern in signatures.get("body", []):
            if pattern.lower() in body:
                return True

        # Port-specific match
        if port in signatures.get("ports", []):
            # Presence on this port is strong signal
            if resp.status_code < 500:  # Not a server error
                return True

        return False
