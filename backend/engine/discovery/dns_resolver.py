"""
TRINETRA — DNS Resolver
Validates all CT log discoveries via active DNS resolution.
Dead assets are flagged separately — they may indicate misconfigured DNS
pointing at decommissioned but still-reachable infrastructure.
"""

import asyncio
from dataclasses import dataclass
from typing import Optional

import dns.asyncresolver
import dns.exception
import dns.resolver
import dns.rdatatype

from core.exceptions import DNSResolutionError
from core.logging import get_logger
from engine.discovery.ct_log_miner import CTLogEntry

log = get_logger(__name__)

# How many DNS resolutions to run concurrently
DNS_CONCURRENCY = 50


@dataclass
class ResolvedAsset:
    fqdn: str
    ip_address: Optional[str]
    is_live: bool
    is_shadow_asset: bool        # True = found in CT logs but not in known asset list
    cert_entry: Optional[CTLogEntry]
    resolution_error: Optional[str] = None
    cname_chain: Optional[list[str]] = None


class DNSResolver:
    """
    Resolves FQDNs discovered via CT log mining.
    Classifies each as live or dead.
    """

    def __init__(self):
        self.resolver = dns.asyncresolver.Resolver()
        self.resolver.timeout = 5
        self.resolver.lifetime = 10

    async def resolve_all(
        self,
        entries: list[CTLogEntry],
        known_assets: Optional[set[str]] = None,
    ) -> tuple[list[ResolvedAsset], list[ResolvedAsset]]:
        """
        Resolves all CT log entries concurrently.

        Args:
            entries: CT log entries to resolve
            known_assets: Set of FQDNs the bank's team confirmed exist.
                          Everything else is a shadow asset.

        Returns:
            (live_assets, dead_assets) — both lists of ResolvedAsset
        """
        known_assets = known_assets or set()
        semaphore = asyncio.Semaphore(DNS_CONCURRENCY)

        async def resolve_one(entry: CTLogEntry) -> ResolvedAsset:
            async with semaphore:
                return await self._resolve_entry(entry, known_assets)

        results = await asyncio.gather(
            *[resolve_one(e) for e in entries],
            return_exceptions=False,
        )

        live = [r for r in results if r.is_live]
        dead = [r for r in results if not r.is_live]

        log.info(
            "dns_resolution_complete",
            total=len(entries),
            live=len(live),
            dead=len(dead),
            shadow=sum(1 for r in live if r.is_shadow_asset),
        )
        return live, dead

    async def _resolve_entry(
        self, entry: CTLogEntry, known_assets: set[str]
    ) -> ResolvedAsset:
        """Resolve a single FQDN."""
        fqdn = entry.fqdn
        is_shadow = fqdn not in known_assets
        cname_chain: list[str] = []

        try:
            # First try A record
            ip = await self._resolve_a(fqdn, cname_chain)
            return ResolvedAsset(
                fqdn=fqdn,
                ip_address=ip,
                is_live=True,
                is_shadow_asset=is_shadow,
                cert_entry=entry,
                cname_chain=cname_chain if cname_chain else None,
            )

        except dns.resolver.NXDOMAIN:
            # Domain definitively does not exist
            return ResolvedAsset(
                fqdn=fqdn,
                ip_address=None,
                is_live=False,
                is_shadow_asset=is_shadow,
                cert_entry=entry,
                resolution_error="NXDOMAIN",
            )

        except dns.resolver.NoAnswer:
            # Domain exists but has no A record — may have CNAME only
            # Try to follow CNAME
            try:
                cname_target = await self._resolve_cname(fqdn)
                if cname_target:
                    cname_chain.append(cname_target)
                    ip = await self._resolve_a(cname_target, cname_chain)
                    return ResolvedAsset(
                        fqdn=fqdn,
                        ip_address=ip,
                        is_live=True,
                        is_shadow_asset=is_shadow,
                        cert_entry=entry,
                        cname_chain=cname_chain,
                    )
            except Exception:
                pass

            return ResolvedAsset(
                fqdn=fqdn,
                ip_address=None,
                is_live=False,
                is_shadow_asset=is_shadow,
                cert_entry=entry,
                resolution_error="NoAnswer",
            )

        except (dns.resolver.Timeout, dns.exception.DNSException) as e:
            return ResolvedAsset(
                fqdn=fqdn,
                ip_address=None,
                is_live=False,
                is_shadow_asset=is_shadow,
                cert_entry=entry,
                resolution_error=f"DNS error: {type(e).__name__}",
            )

    async def _resolve_a(self, fqdn: str, cname_chain: list[str]) -> str:
        """Resolve FQDN to IP address, following CNAMEs."""
        answer = await self.resolver.resolve(fqdn, "A")
        # Return first A record
        return str(answer[0])

    async def _resolve_cname(self, fqdn: str) -> Optional[str]:
        """Returns CNAME target if one exists."""
        try:
            answer = await self.resolver.resolve(fqdn, "CNAME")
            return str(answer[0]).rstrip(".")
        except Exception:
            return None

    async def resolve_mx(self, domain: str) -> list[str]:
        """
        Returns MX records for email TLS scanning.
        Used by smtp_tls.py to find mail servers.
        """
        try:
            answer = await self.resolver.resolve(domain, "MX")
            return sorted(
                [str(r.exchange).rstrip(".") for r in answer],
                key=lambda x: x  # sort alphabetically
            )
        except Exception:
            return []

    async def check_dnssec(self, domain: str) -> bool:
        """
        Checks if DNSSEC is enabled for the domain.
        Basic check: queries for DS record at parent zone.
        """
        try:
            await self.resolver.resolve(domain, "DS")
            return True
        except dns.resolver.NoAnswer:
            return False
        except Exception:
            return False
