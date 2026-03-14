"""
TRINETRA — CT Log Miner
Queries Certificate Transparency logs via crt.sh REST API (RFC 6962).
Discovers every subdomain a bank has ever registered — including forgotten ones.

Research basis: Scheitle et al., ACM IMC 2018
"The Rise of Certificate Transparency and Its Implications on the Internet Ecosystem"
"""

import asyncio
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from backend.core.config import settings
from backend.core.exceptions import CTLogError
from backend.core.logging import get_logger

log = get_logger(__name__)


@dataclass
class CTLogEntry:
    fqdn: str
    cert_id: Optional[int]
    issuer: Optional[str]
    not_before: Optional[str]
    not_after: Optional[str]
    is_wildcard: bool
    source: str = "crt.sh"


class CTLogMiner:
    """
    Queries crt.sh Certificate Transparency log database.
    Returns all subdomains ever registered for a given domain.

    crt.sh API format:
    https://crt.sh/?q=%.domain.com&output=json&deduplicate=Y
    """

    # Regex for valid FQDN — no IPs, no wildcards in output
    FQDN_PATTERN = re.compile(
        r"^(?:[a-zA-Z0-9]"
        r"(?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+"
        r"[a-zA-Z]{2,}$"
    )

    def __init__(self):
        self.base_url = settings.crtsh_base_url
        self.timeout = settings.ct_log_timeout_seconds

    @retry(
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def _fetch_crtsh(self, query: str) -> list[dict]:
        """Raw crt.sh API call with retry on network failures."""
        url = f"{self.base_url}/?q={query}&output=json&deduplicate=Y"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, headers={"Accept": "application/json"})
            resp.raise_for_status()
            return resp.json()

    async def mine(self, domain: str) -> list[CTLogEntry]:
        """
        Main entry point. Returns all unique subdomains found in CT logs.

        Args:
            domain: Root domain e.g. "pnb.in"

        Returns:
            List of CTLogEntry — deduplicated, validated FQDNs only.
        """
        domain = domain.lower().strip().removeprefix("www.")
        log.info("ct_mining_started", domain=domain)

        try:
            # Query with wildcard prefix — catches all subdomains
            raw_certs = await self._fetch_crtsh(f"%.{domain}")
        except httpx.HTTPStatusError as e:
            raise CTLogError(
                f"crt.sh returned HTTP {e.response.status_code} for {domain}",
                detail=str(e),
            )
        except (httpx.TimeoutException, httpx.ConnectError) as e:
            raise CTLogError(f"crt.sh unreachable for {domain}", detail=str(e))

        if not raw_certs:
            log.warning("ct_no_results", domain=domain)
            return []

        entries = self._parse_and_deduplicate(raw_certs, domain)

        log.info(
            "ct_mining_complete",
            domain=domain,
            raw_certs=len(raw_certs),
            unique_fqdns=len(entries),
            wildcards=sum(1 for e in entries if e.is_wildcard),
        )
        return entries

    def _parse_and_deduplicate(
        self, raw_certs: list[dict], root_domain: str
    ) -> list[CTLogEntry]:
        """
        crt.sh returns one row per certificate.
        name_value field is newline-separated — one cert can have many SANs.
        This is the most common parsing bug: most implementations miss ~30% of assets.
        """
        seen: set[str] = set()
        entries: list[CTLogEntry] = []

        for cert in raw_certs:
            # name_value contains all SANs, newline-separated
            name_value: str = cert.get("name_value", "")
            cert_id = cert.get("id")
            issuer = cert.get("issuer_name", "")
            not_before = cert.get("not_before")
            not_after = cert.get("not_after")

            for raw_name in name_value.split("\n"):
                name = raw_name.strip().lower()
                if not name:
                    continue

                is_wildcard = name.startswith("*.")
                if is_wildcard:
                    # Store the base domain (without the *.)
                    # Wildcard certs cover all direct subdomains
                    name = name[2:]

                # Skip if this is just the root domain itself
                if name == root_domain:
                    continue

                # Skip if not a subdomain of the root domain
                if not name.endswith(f".{root_domain}") and name != root_domain:
                    continue

                # Validate FQDN format
                if not self.FQDN_PATTERN.match(name):
                    continue

                # Deduplicate
                if name in seen:
                    continue

                seen.add(name)
                entries.append(
                    CTLogEntry(
                        fqdn=name,
                        cert_id=cert_id,
                        issuer=self._clean_issuer(issuer),
                        not_before=not_before,
                        not_after=not_after,
                        is_wildcard=is_wildcard,
                    )
                )

        return entries

    def _clean_issuer(self, issuer_raw: str) -> str:
        """Extract just the O= (organization) field from issuer DN."""
        if not issuer_raw:
            return "Unknown"
        for part in issuer_raw.split(","):
            part = part.strip()
            if part.startswith("O="):
                return part[2:].strip().strip('"')
        return issuer_raw[:100]

    def is_expired(self, entry: CTLogEntry) -> bool:
        """Returns True if the certificate is past its not_after date."""
        if not entry.not_after:
            return False
        try:
            expiry = datetime.fromisoformat(entry.not_after.replace("Z", "+00:00"))
            return expiry < datetime.now(expiry.tzinfo)
        except (ValueError, AttributeError):
            return False
