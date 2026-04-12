"""
TRINETRA — Asset Classifier
Determines asset type from port scan results and HTTP fingerprinting.
Output type drives which scanner workers are dispatched.

Asset types:
  web_portal      — customer-facing HTTPS site
  api_endpoint    — REST/GraphQL API endpoint
  vpn_gateway     — SSL VPN gateway (Cisco, Fortinet, Palo Alto, OpenVPN)
  ssh_endpoint    — SSH management access
  smtp_mta        — Mail transfer agent (email TLS)
  mobile_backend  — Mobile app backend (detected via User-Agent hints)
  staging         — Staging/UAT environment
  shadow_asset    — Not in bank's known asset list
"""

import asyncio
from dataclasses import dataclass
from typing import Optional

import httpx

from core.constants import VPN_FINGERPRINTS, VPN_PORTS
from core.config import settings
from core.logging import get_logger
from engine.discovery.port_scanner import PortScanResult

log = get_logger(__name__)

HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; TRINETRA-Scanner/1.0)",
    "Accept": "text/html,application/xhtml+xml,application/json",
}


@dataclass
class ClassifiedAsset:
    fqdn: str
    ip_address: str
    port: int
    asset_type: str
    asset_url: str
    is_shadow_asset: bool
    http_status: Optional[int] = None
    server_header: Optional[str] = None
    content_type: Optional[str] = None
    vpn_type: Optional[str] = None
    # Which scanner workers to dispatch
    needs_tls_scan: bool = True
    needs_api_scan: bool = False
    needs_vpn_scan: bool = False
    needs_ssh_scan: bool = False
    needs_smtp_scan: bool = False


class AssetClassifier:
    """
    Classifies discovered assets by probing HTTP and matching fingerprints.
    """

    async def classify_all(
        self,
        port_results: list[PortScanResult],
        shadow_fqdns: set[str],
    ) -> list[ClassifiedAsset]:
        """
        Classifies all assets from port scan results.

        Args:
            port_results: Port scan results for each live asset
            shadow_fqdns: FQDNs not in the bank's known asset list

        Returns:
            List of ClassifiedAsset — one per open HTTPS/SSH/SMTP port
        """
        tasks = []
        for pr in port_results:
            is_shadow = pr.fqdn in shadow_fqdns
            tasks.append(self._classify_one(pr, is_shadow))

        # return_exceptions=True prevents one bad host from aborting all 214 others
        results_nested = await asyncio.gather(*tasks, return_exceptions=True)

        # Flatten — one PortScanResult may yield multiple assets (different ports)
        classified: list[ClassifiedAsset] = []
        errors = 0
        for result in results_nested:
            if isinstance(result, Exception):
                errors += 1
                log.warning("asset_classify_one_failed", error=str(result))
                continue
            classified.extend(result)

        log.info(
            "asset_classification_complete",
            total=len(classified),
            errors=errors,
            types={t: sum(1 for a in classified if a.asset_type == t)
                   for t in set(a.asset_type for a in classified)},
        )
        return classified

    async def _classify_one(
        self, pr: PortScanResult, is_shadow: bool
    ) -> list[ClassifiedAsset]:
        """Classify a single port scan result into 1+ assets."""
        assets: list[ClassifiedAsset] = []

        # ── HTTPS/HTTP assets (web, API, VPN) ─────────────────────────────────
        for port in [80, 443, 8443, 4433, 10443]:
            if port not in pr.open_ports:
                continue

            schema = "http" if port == 80 else "https"
            url = f"{schema}://{pr.fqdn}" if port in (80, 443) else f"{schema}://{pr.fqdn}:{port}"
            fingerprint = await self._http_fingerprint(url)

            # Check for VPN first — most specific match
            vpn_type = self._detect_vpn(fingerprint, port)
            if vpn_type:
                assets.append(ClassifiedAsset(
                    fqdn=pr.fqdn,
                    ip_address=pr.ip_address,
                    port=port,
                    asset_type="vpn_gateway",
                    asset_url=url,
                    is_shadow_asset=is_shadow,
                    http_status=fingerprint.get("status"),
                    server_header=fingerprint.get("server"),
                    vpn_type=vpn_type,
                    needs_tls_scan=True,
                    needs_vpn_scan=True,
                ))
                continue

            # Detect API endpoint vs web portal
            asset_type = self._detect_web_type(fingerprint, pr.fqdn)

            assets.append(ClassifiedAsset(
                fqdn=pr.fqdn,
                ip_address=pr.ip_address,
                port=port,
                asset_type=asset_type,
                asset_url=url,
                is_shadow_asset=is_shadow,
                http_status=fingerprint.get("status"),
                server_header=fingerprint.get("server"),
                content_type=fingerprint.get("content_type"),
                needs_tls_scan=True,
                needs_api_scan=True,  # Always inspect HTTP — can't know what's there without probing
            ))

        # ── SSH ───────────────────────────────────────────────────────────────
        if pr.has_ssh:
            assets.append(ClassifiedAsset(
                fqdn=pr.fqdn,
                ip_address=pr.ip_address,
                port=22,
                asset_type="ssh_endpoint",
                asset_url=f"ssh://{pr.fqdn}:22",
                is_shadow_asset=is_shadow,
                needs_tls_scan=False,
                needs_ssh_scan=True,
            ))

        # ── SMTP ──────────────────────────────────────────────────────────────
        for smtp_port in [25, 587]:
            if smtp_port in pr.open_ports:
                assets.append(ClassifiedAsset(
                    fqdn=pr.fqdn,
                    ip_address=pr.ip_address,
                    port=smtp_port,
                    asset_type="smtp_mta",
                    asset_url=f"smtp://{pr.fqdn}:{smtp_port}",
                    is_shadow_asset=is_shadow,
                    needs_tls_scan=False,
                    needs_smtp_scan=True,
                ))

        return assets

    async def _http_fingerprint(self, url: str) -> dict:
        """
        Sends HEAD (fallback GET) to collect response metadata.
        Returns dict of status, server, content_type, body_preview, headers.
        Always returns a dict — never raises.
        """
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(10.0, connect=5.0),
                follow_redirects=True,
                verify=False,  # We handle cert validation in cert_analyzer
            ) as client:
                try:
                    resp = await client.head(url, headers={
                        "User-Agent": "Mozilla/5.0 (compatible; TRINETRA-Scanner/1.0)",
                        "Accept": "text/html,application/xhtml+xml,application/json",
                    })
                except (httpx.RemoteProtocolError, httpx.ReadError):
                    resp = await client.get(url, headers={
                        "User-Agent": "Mozilla/5.0 (compatible; TRINETRA-Scanner/1.0)",
                        "Accept": "text/html,application/xhtml+xml,application/json",
                    })

                body_preview = ""
                if resp.method == "GET":
                    try:
                        body_preview = resp.text[:500]
                    except Exception:
                        pass

                return {
                    "status": resp.status_code,
                    "server": resp.headers.get("server", ""),
                    "content_type": resp.headers.get("content-type", ""),
                    "x_powered_by": resp.headers.get("x-powered-by", ""),
                    "body_preview": body_preview,
                    "headers": dict(resp.headers),
                    "url": str(resp.url),
                }

        except httpx.TimeoutException:
            return {"status": None, "server": "", "content_type": "", "error": "timeout",
                    "body_preview": "", "headers": {}, "url": url}
        except Exception as e:
            return {"status": None, "server": "", "content_type": "", "error": str(e)[:200],
                    "body_preview": "", "headers": {}, "url": url}

    def _detect_vpn(self, fingerprint: dict, port: int) -> Optional[str]:
        """
        Checks fingerprint against known VPN signatures.
        Returns VPN type string or None.
        """
        body = fingerprint.get("body_preview", "").lower()
        headers = fingerprint.get("headers", {})
        url = fingerprint.get("url", "")

        for vpn_type, signatures in VPN_FINGERPRINTS.items():
            # Check path patterns in redirect URL
            for path in signatures.get("paths", []):
                if path in url:
                    return vpn_type

            # Check response headers
            for header in signatures.get("headers", []):
                if header.lower() in {k.lower() for k in headers.keys()}:
                    return vpn_type

            # Check body patterns
            for pattern in signatures.get("body", []):
                if pattern.lower() in body:
                    return vpn_type

            # Check port-specific VPN
            if port in signatures.get("ports", []):
                return vpn_type

        return None

    def _detect_web_type(self, fingerprint: dict, fqdn: str) -> str:
        """
        Determines asset type from FQDN keywords, content-type, and body.
        Banking-aware: covers Indian banking subdomain patterns.
        """
        content_type = fingerprint.get("content_type", "").lower()
        body = fingerprint.get("body_preview", "").lower()
        fqdn_lower = fqdn.lower()
        # Split into subdomain segments for exact-segment matching
        fqdn_parts = set(fqdn_lower.replace("-", "").split("."))

        # ── Staging/UAT — highest priority ────────────────────────────────────
        staging_kw = {"staging", "uat", "test", "dev", "qa", "sandbox", "preprod", "sit"}
        if fqdn_parts & staging_kw or any(kw in fqdn_lower for kw in staging_kw):
            return "staging"

        # ── Mobile backend ─────────────────────────────────────────────────────
        mobile_kw = {"mobile", "mapi", "mbanking", "mbankingapi"}
        if fqdn_parts & mobile_kw or any(kw in fqdn_lower for kw in ["mobile.", "mapi.", "m."]):
            return "mobile_backend"

        # ── API endpoint — FQDN segment exact match (most reliable) ───────────
        api_exact_segments = {
            "api", "apis", "gateway", "gw", "ws", "rest", "graphql",
            "oauth", "auth", "sso", "token", "openid", "oidc", "idp",
            "services", "service", "microservice", "backend",
            # Banking-specific API patterns
            "mcaapi", "ncaapi", "corpapi", "retailapi", "ibankingapi",
            "payapi", "upiapi", "neftapi", "rtgsapi", "impsapi",
        }
        if fqdn_parts & api_exact_segments:
            return "api_endpoint"

        # ── API endpoint — substring in full FQDN ─────────────────────────────
        api_substring_kw = [
            "api.", ".api.", "-api.", "api-",
            "gateway.", ".gateway", "services.",
            "oauth.", "auth.", "sso.", "token.",
            "mcaapi", "ncaapi", "corpapi",
        ]
        if any(kw in fqdn_lower for kw in api_substring_kw):
            return "api_endpoint"

        # ── API endpoint — content-type signals ───────────────────────────────
        if "application/json" in content_type or "application/xml" in content_type:
            return "api_endpoint"

        # ── API endpoint — JSON body ───────────────────────────────────────────
        body_stripped = body.strip()
        if body_stripped and (body_stripped.startswith("{") or body_stripped.startswith("[")):
            return "api_endpoint"

        # ── Banking internet banking portals ───────────────────────────────────
        # These are customer-facing web portals, not APIs
        banking_portal_kw = {
            "ibanking", "netbanking", "internetbanking", "ebanking",
            "onlinebanking", "icorp", "iretail", "ibusiness",
            "kyc", "kyc360", "locate", "branch", "atm",
            "retail", "corp", "corporate", "sme", "nri",
        }
        if fqdn_parts & banking_portal_kw:
            return "web_portal"

        return "web_portal"
