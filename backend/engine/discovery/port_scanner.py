"""
TRINETRA — Port Scanner
Socket-level port probing for all discovered live assets.
Determines which services are open before dispatching
the correct specialized scanner.
"""

import asyncio
import socket
from dataclasses import dataclass, field
from typing import Optional

from core.constants import VPN_PORTS
from core.logging import get_logger

log = get_logger(__name__)

# All ports we probe across all scan types
SCAN_PORTS = {
    443:   "https",
    80:    "http",
    8443:  "https-alt",
    4433:  "https-alt",
    10443: "https-alt",
    22:    "ssh",
    25:    "smtp",
    587:   "smtp-submission",
    993:   "imaps",
    1194:  "openvpn",
    943:   "openvpn-admin",
}

PORT_CONCURRENCY = 100
PORT_TIMEOUT = 3.0  # seconds


@dataclass
class PortScanResult:
    ip_address: str
    fqdn: str
    open_ports: list[int] = field(default_factory=list)
    services: dict[int, str] = field(default_factory=dict)
    # Derived service types
    has_https: bool = False
    has_ssh: bool = False
    has_smtp: bool = False
    has_vpn_ports: bool = False


async def _probe_port(ip: str, port: int, timeout: float) -> bool:
    """
    Attempts a TCP connection to ip:port.
    Returns True if connection succeeds (port is open).
    """
    try:
        _, writer = await asyncio.wait_for(
            asyncio.open_connection(ip, port),
            timeout=timeout,
        )
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        return True
    except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
        return False


class PortScanner:
    """
    Probes all relevant ports on a live IP address.
    Results determine which scanner workers are dispatched.
    """

    def __init__(self):
        self.timeout = PORT_TIMEOUT
        self.semaphore = asyncio.Semaphore(PORT_CONCURRENCY)

    async def scan(self, ip_address: str, fqdn: str) -> PortScanResult:
        """
        Scans all SCAN_PORTS on the given IP.
        Returns PortScanResult with open ports and inferred services.
        """
        result = PortScanResult(ip_address=ip_address, fqdn=fqdn)

        async def probe_one(port: int) -> tuple[int, bool]:
            async with self.semaphore:
                is_open = await _probe_port(ip_address, port, self.timeout)
                return port, is_open

        probe_results = await asyncio.gather(
            *[probe_one(p) for p in SCAN_PORTS.keys()]
        )

        for port, is_open in probe_results:
            if is_open:
                result.open_ports.append(port)
                result.services[port] = SCAN_PORTS[port]

        # Derive service flags
        result.has_https = any(p in result.open_ports for p in [443, 8443, 4433, 10443])
        result.has_ssh = 22 in result.open_ports
        result.has_smtp = any(p in result.open_ports for p in [25, 587])
        result.has_vpn_ports = any(p in result.open_ports for p in VPN_PORTS)

        log.debug(
            "port_scan_complete",
            fqdn=fqdn,
            ip=ip_address,
            open_ports=result.open_ports,
        )
        return result

    async def scan_all(
        self, assets: list[tuple[str, str]]
    ) -> list[PortScanResult]:
        """
        Scans multiple (ip, fqdn) pairs concurrently.

        Args:
            assets: list of (ip_address, fqdn) tuples

        Returns:
            List of PortScanResult — one per asset
        """
        results = await asyncio.gather(
            *[self.scan(ip, fqdn) for ip, fqdn in assets],
            return_exceptions=False,
        )
        return results
