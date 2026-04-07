
"""
TRINETRA — CT Log Miner
Queries Certificate Transparency logs via crt.sh REST API (RFC 6962).
Discovers every subdomain a bank has ever registered — including forgotten ones.

Research basis: Scheitle et al., ACM IMC 2018
"The Rise of Certificate Transparency and Its Implications on the Internet Ecosystem"

Resilience design:
  - Primary:   crt.sh  (retry on 500/503/429 with exponential back-off)
  - Fallback 1: certspotter.com (alternative CT index, real-time stream)
  - Fallback 2: HackerTarget subdomain API (passive DNS, no auth required)
  - Fallback 3: Root domain only (guarantees at least one asset to scan)
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
    before_sleep_log,
)
import logging

from core.config import settings
from core.exceptions import CTLogError
from core.logging import get_logger

log = get_logger(__name__)
_tenacity_log = logging.getLogger("tenacity")


@dataclass
class CTLogEntry:
    fqdn: str
    cert_id: Optional[int]
    issuer: Optional[str]
    not_before: Optional[str]
    not_after: Optional[str]
    is_wildcard: bool
    source: str = "crt.sh"


# ── Retry helpers ─────────────────────────────────────────────────────────────

def _is_retryable(exc: BaseException) -> bool:
    """Retry on network errors AND server-side 5xx / 429 rate-limits."""
    if isinstance(exc, (httpx.TimeoutException, httpx.ConnectError)):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in {429, 500, 502, 503, 504}
    return False


def _clean_domain(raw: str) -> str:
    """
    Normalise any user-supplied string to a bare FQDN.
    Handles:  https://pnb.bank.in/  →  pnb.bank.in
              http://www.example.com/path?q=1  →  example.com
              pnb.bank.in:443  →  pnb.bank.in
              HTTPS://PNB.BANK.IN  →  pnb.bank.in
    """
    d = raw.strip().lower()
    # Strip scheme
    if d.startswith("https://"):
        d = d[8:]
    elif d.startswith("http://"):
        d = d[7:]
    # Strip path and query string (keep only hostname[:port])
    d = d.split("/")[0].split("?")[0]
    # Strip port
    d = d.split(":")[0]
    # Strip www. prefix
    if d.startswith("www."):
        d = d[4:]
    return d


class CTLogMiner:
    """
    Queries Certificate Transparency logs for all subdomains of a domain.

    Priority chain:
      1. crt.sh   — most complete, but sometimes returns 503 under load
      2. Certspotter — real-time CT stream, independent infrastructure
      3. HackerTarget — passive DNS, lightweight API
      4. Root domain only — always succeeds (zero-CT fallback)
    """

    # Regex for valid FQDN — no IPs, no wildcards in output
    FQDN_PATTERN = re.compile(
        r"^(?:[a-zA-Z0-9]"
        r"(?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*"
        r"[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
        r"\.[a-zA-Z]{2,}$"
    )

    def __init__(self):
        self.base_url = settings.crtsh_base_url
        self.timeout = settings.ct_log_timeout_seconds

    # ── Primary source: crt.sh ────────────────────────────────────────────────

    @retry(
        retry=retry_if_exception_type((
            httpx.TimeoutException,
            httpx.ConnectError,
            httpx.HTTPStatusError,
        )),
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=2, min=3, max=30),
        before_sleep=before_sleep_log(_tenacity_log, logging.WARNING),
        reraise=True,
    )
    async def _fetch_crtsh(self, query: str) -> list[dict]:
        """Raw crt.sh API call with retry on network failures AND 5xx/429."""
        url = f"{self.base_url}/?q={query}&output=json&deduplicate=Y"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, headers={"Accept": "application/json"})
            resp.raise_for_status()          # raises HTTPStatusError on 4xx/5xx
            return resp.json()

    # ── Fallback 1: Certspotter ────────────────────────────────────────────────

    async def _fetch_certspotter(self, domain: str) -> list[CTLogEntry]:
        """
        Certspotter issuances endpoint. Free tier returns ~100 most recent certs.
        https://api.certspotter.com/v1/issuances?domain=...&include_subdomains=true
        """
        url = (
            f"https://api.certspotter.com/v1/issuances"
            f"?domain={domain}&include_subdomains=true&expand=dns_names"
        )
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(url, headers={"Accept": "application/json"})
                if resp.status_code != 200:
                    log.warning("certspotter_non200", status=resp.status_code, domain=domain)
                    return []
                data = resp.json()
        except Exception as exc:
            log.warning("certspotter_unreachable", domain=domain, error=str(exc))
            return []

        entries: list[CTLogEntry] = []
        seen: set[str] = set()
        for record in data:
            for name in record.get("dns_names", []):
                name = name.lower().strip()
                is_wildcard = name.startswith("*.")
                if is_wildcard:
                    name = name[2:]
                if name == domain or not name.endswith(f".{domain}"):
                    continue
                if not self.FQDN_PATTERN.match(name):
                    continue
                if name in seen:
                    continue
                seen.add(name)
                entries.append(CTLogEntry(
                    fqdn=name,
                    cert_id=None,
                    issuer=record.get("issuer", {}).get("name"),
                    not_before=record.get("not_before"),
                    not_after=record.get("not_after"),
                    is_wildcard=is_wildcard,
                    source="certspotter",
                ))
        log.info("certspotter_results", domain=domain, count=len(entries))
        return entries

    # ── Fallback 2: HackerTarget ───────────────────────────────────────────────

    async def _fetch_hackertarget(self, domain: str) -> list[CTLogEntry]:
        """
        HackerTarget subdomain API (passive DNS). No auth, free tier.
        https://api.hackertarget.com/hostsearch/?q=domain.com
        Returns plain-text CSV: subdomain,ip
        """
        url = f"https://api.hackertarget.com/hostsearch/?q={domain}"
        try:
            async with httpx.AsyncClient(timeout=settings.http_inspect_timeout) as client:
                resp = await client.get(url)
                if resp.status_code != 200 or "error" in resp.text.lower():
                    return []
                lines = resp.text.strip().splitlines()
        except Exception as exc:
            log.warning("hackertarget_unreachable", domain=domain, error=str(exc))
            return []

        entries: list[CTLogEntry] = []
        seen: set[str] = set()
        for line in lines:
            parts = line.split(",")
            if not parts:
                continue
            name = parts[0].strip().lower()
            if name == domain or not name.endswith(f".{domain}"):
                continue
            if not self.FQDN_PATTERN.match(name):
                continue
            if name in seen:
                continue
            seen.add(name)
            entries.append(CTLogEntry(
                fqdn=name,
                cert_id=None,
                issuer=None,
                not_before=None,
                not_after=None,
                is_wildcard=False,
                source="hackertarget",
            ))
        log.info("hackertarget_results", domain=domain, count=len(entries))
        return entries

    # ── Fallback 3: Root domain ────────────────────────────────────────────────

    def _root_domain_entry(self, domain: str) -> list[CTLogEntry]:
        """Guarantees at least one asset — the root domain itself."""
        log.warning("ct_using_root_only_fallback", domain=domain)
        return [CTLogEntry(
            fqdn=domain,
            cert_id=None,
            issuer=None,
            not_before=None,
            not_after=None,
            is_wildcard=False,
            source="root_fallback",
        )]

    # ── Public entry point ────────────────────────────────────────────────────

    async def mine(self, domain: str, root_only: bool = False) -> list[CTLogEntry]:
        """
        Main entry point. Returns all unique subdomains found in CT logs.
        By default discovers all subdomains; can be restricted to root domain only.
        Tries crt.sh first; falls back through certspotter → hackertarget →
        root-only rather than raising an exception.

        Args:
            domain: Root domain e.g. "pnb.bank.in" or "https://pnb.bank.in/"
            root_only: If True, return only the root domain without discovering subdomains.
                      If False (default), discover all subdomains from CT logs.

        Returns:
            List of CTLogEntry — deduplicated, validated FQDNs only.
            Never empty (root-domain fallback guarantees ≥ 1 entry).
        """
        domain = _clean_domain(domain)
        log.info("ct_mining_started", domain=domain, root_only=root_only)

        # ── If root_only mode, skip CT logs and return just the root domain ────
        if root_only:
            log.info("ct_mining_root_only_mode", domain=domain)
            return self._root_domain_entry(domain)

        # ── 1. crt.sh (primary) ───────────────────────────────────────────────
        try:
            raw_certs = await self._fetch_crtsh(f"%.{domain}")
            if raw_certs:
                entries = self._parse_and_deduplicate(raw_certs, domain)
                log.info(
                    "ct_mining_complete",
                    source="crt.sh",
                    domain=domain,
                    raw_certs=len(raw_certs),
                    unique_fqdns=len(entries),
                    wildcards=sum(1 for e in entries if e.is_wildcard),
                )
                return entries or self._root_domain_entry(domain)
        except httpx.HTTPStatusError as exc:
            log.warning(
                "crtsh_http_error",
                status=exc.response.status_code,
                domain=domain,
                msg="Trying fallback sources",
            )
        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            log.warning("crtsh_network_error", domain=domain, error=str(exc))
        except Exception as exc:
            log.warning("crtsh_unexpected_error", domain=domain, error=str(exc))

        # ── 2. Certspotter fallback ───────────────────────────────────────────
        log.info("ct_fallback_certspotter", domain=domain)
        entries = await self._fetch_certspotter(domain)
        if entries:
            return entries

        # ── 3. HackerTarget fallback ──────────────────────────────────────────
        log.info("ct_fallback_hackertarget", domain=domain)
        entries = await self._fetch_hackertarget(domain)
        if entries:
            return entries

        # ── 4. Root-domain zero fallback ──────────────────────────────────────
        return self._root_domain_entry(domain)

    # ── Parsers ───────────────────────────────────────────────────────────────

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
                    name = name[2:]

                if name == root_domain:
                    continue

                if not name.endswith(f".{root_domain}") and name != root_domain:
                    continue

                if not self.FQDN_PATTERN.match(name):
                    continue

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
