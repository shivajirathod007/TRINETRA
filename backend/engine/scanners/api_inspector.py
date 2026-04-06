"""
TRINETRA — API Inspector
Probes HTTP API endpoints for cryptographic exposure.
Detects: JWT algorithm, OAuth signing, WWW-Authenticate type,
CORS policy, GraphQL introspection, security headers.
"""

import base64
import json
import re
import asyncio
from dataclasses import dataclass, field
from typing import Optional, Set

import httpx

from core.logging import get_logger
from core.config import settings

log = get_logger(__name__)

# Regex to find JWT-shaped tokens (3 base64url segments separated by dots)
JWT_PATTERN = re.compile(r"eyJ[A-Za-z0-9_\-]+\.eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+")

# Security headers we check for presence/absence
SECURITY_HEADERS = {
    "strict-transport-security": "HSTS",
    "content-security-policy": "CSP",
    "x-frame-options": "X-Frame-Options",
    "x-content-type-options": "X-Content-Type-Options",
    "x-xss-protection": "X-XSS-Protection",
    "referrer-policy": "Referrer-Policy",
}

PQC_JWT_ALGS = {"ML-DSA-65", "DILITHIUM3"}
VULNERABLE_JWT_ALGS = {"RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "PS256", "PS384", "PS512", "none"}


@dataclass
class APIInspectResult:
    asset_url: str
    # JWT
    jwt_algorithm: Optional[str] = None
    jwt_quantum_safe: Optional[bool] = None
    jwt_location: Optional[str] = None       # where JWT was found
    # Auth
    auth_type: Optional[str] = None          # Bearer | Basic | NTLM | API-Key
    www_authenticate: Optional[str] = None
    # Security headers
    hsts_enabled: bool = False
    hsts_max_age: Optional[int] = None
    csp_present: bool = False
    security_headers_present: list[str] = field(default_factory=list)
    security_headers_missing: list[str] = field(default_factory=list)
    # CORS
    cors_policy: Optional[str] = None        # permissive | restrictive | none
    cors_allow_origin: Optional[str] = None
    # GraphQL
    graphql_introspection: bool = False
    graphql_endpoint: Optional[str] = None
    # OAuth
    oauth_token_endpoint: Optional[str] = None
    oauth_signing_algorithm: Optional[str] = None
    # Endpoints
    endpoints_scanned: list[str] = field(default_factory=list)
    # Raw response metadata
    http_status: Optional[int] = None
    response_body_preview: Optional[str] = None  # First 4000 chars for AI classifier
    response_headers_raw: dict = field(default_factory=dict)
    # Findings
    findings: list[str] = field(default_factory=list)
    error: Optional[str] = None


class APIInspector:
    """
    Probes API endpoints to discover cryptographic usage.
    Results feed both the CBOM directly and the AI classifier.
    """

    async def inspect(self, url: str) -> APIInspectResult:
        """
        Full API inspection of a single URL.
        Never raises — errors captured in result.error.
        """
        result = APIInspectResult(asset_url=url)
        # Use sets to avoid duplicate entries during concurrent scans
        sec_present = set()
        sec_missing = set()
        findings_set = set()

        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(10.0, connect=4.0),
                verify=False,
                follow_redirects=True,
            ) as client:
                
                # 1. Discover endpoints dynamically
                endpoints = await self._discover_endpoints(client, url)
                result.endpoints_scanned = list(endpoints)
                
                # 2. Concurrently scan all discovered endpoints natively
                semaphore = asyncio.Semaphore(10) # max concurrency
                
                async def sem_fetch(ep: str):
                    async with semaphore:
                        target_url = url.rstrip("/") + ep
                        await self._fetch_and_check(client, target_url, result, sec_present, sec_missing, findings_set)

                await asyncio.gather(*[sem_fetch(ep) for ep in endpoints])

                # 3. Check special endpoints and graphQL (these target specific paths)
                await self._check_graphql(client, url, result, findings_set)
                await self._check_well_known(client, url, result, findings_set)

                # Persist deduplicated values
                result.security_headers_present = list(sec_present)
                result.security_headers_missing = list(sec_missing)
                result.findings.extend(list(findings_set))
                
                if result.endpoints_scanned:
                    result.findings.append(f"Discovered and scanned {len(result.endpoints_scanned)} unique in-scope endpoints (including robots.txt, sitemap, HTML parsing, common API paths).")

        except httpx.TimeoutException:
            result.error = "Request timed out"
        except httpx.ConnectError as e:
            result.error = f"Connection error: {str(e)[:100]}"
        except Exception as e:
            result.error = f"Inspection error: {str(e)[:200]}"

        log.info(
            "api_inspection_complete",
            url=url,
            jwt_algo=result.jwt_algorithm,
            auth_type=result.auth_type,
            graphql=result.graphql_introspection,
            endpoints_count=len(result.endpoints_scanned)
        )
        return result

    async def _discover_endpoints(self, client: httpx.AsyncClient, base_url: str) -> set[str]:
        """Actively crawls and discovers in-scope endpoints for the asset."""
        endpoints = {"/"}
        common_api_paths = ["/api/v1", "/api", "/v1", "/swagger.json", "/openapi.json", "/api-docs", "/docs"]
        for p in common_api_paths:
            endpoints.add(p)

        try:
            # 1. Parse robots.txt
            r_resp = await client.get(base_url.rstrip("/") + "/robots.txt", timeout=3.0)
            if r_resp.status_code == 200:
                for line in r_resp.text.splitlines():
                    if line.lower().startswith("allow:") or line.lower().startswith("disallow:"):
                        path = line.split(":", 1)[1].strip()
                        if path and path.startswith("/"):
                            endpoints.add(path)
        except Exception:
            pass

        try:
            # 2. Parse sitemap.xml
            s_resp = await client.get(base_url.rstrip("/") + "/sitemap.xml", timeout=3.0)
            if s_resp.status_code == 200:
                locs = re.findall(r"<loc>(.*?)</loc>", s_resp.text)
                for loc in locs:
                    if loc.startswith(base_url):
                        path = loc[len(base_url):]
                        if not path.startswith("/"):
                            path = "/" + path
                        endpoints.add(path)
        except Exception:
            pass

        try:
            # 3. Simple root page crawl for href and src
            root_resp = await client.get(base_url, timeout=3.0)
            if root_resp.status_code == 200:
                hrefs = re.findall(r'href=["\'](/[^"\']+)["\']', root_resp.text)
                srcs = re.findall(r'src=["\'](/[^"\']+)["\']', root_resp.text)
                for h in hrefs + srcs:
                    endpoints.add(h)
        except Exception:
            pass

        # Limit to top 25 paths to prevent overwhelming the server with requests
        endpoints_list = list(endpoints)  # type: ignore
        return set(endpoints_list[:25])

    async def _fetch_and_check(self, client: httpx.AsyncClient, target_url: str, result: APIInspectResult, sec_present: set, sec_missing: set, findings_set: set) -> None:
        """Fetches a specific path and analyzes the response."""
        try:
            resp = await client.get(
                target_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; TRINETRA-Scanner/1.0)",
                    "Accept": "application/json, text/html, */*",
                }
            )
            
            # Record global responses based on the root payload
            if target_url == result.asset_url or result.http_status is None:
                if result.http_status != 200: # Only override if we found a better response or it's none
                    result.http_status = resp.status_code
                    result.response_headers_raw = dict(resp.headers)
                    result.response_body_preview = resp.text[:settings.api_body_preview_chars]

            self._check_security_headers(resp, result, sec_present, sec_missing)
            self._check_auth(resp, result, findings_set)
            self._check_jwt(resp, resp.text, result, findings_set)
            self._check_cors(resp, result, findings_set)
            self._check_oauth_hints(resp.text, result, findings_set)
        except Exception:
            pass

    def _check_security_headers(self, resp: httpx.Response, result: APIInspectResult, sec_present: set, sec_missing: set) -> None:
        """Check presence/absence of security headers."""
        headers_lower = {k.lower(): v for k, v in resp.headers.items()}

        for header_key, header_name in SECURITY_HEADERS.items():
            if header_key in headers_lower:
                sec_present.add(header_name)
            else:
                sec_missing.add(header_name)

        # HSTS detail
        hsts = headers_lower.get("strict-transport-security", "")
        if hsts:
            result.hsts_enabled = True
            max_age_match = re.search(r"max-age=(\d+)", hsts)
            if max_age_match:
                # Store the max limit found across endpoints
                max_age_val = int(max_age_match.group(1))
                current_max = result.hsts_max_age
                if current_max is None or max_age_val > current_max:
                    result.hsts_max_age = max_age_val

        if "content-security-policy" in headers_lower:
            result.csp_present = True

    def _check_auth(self, resp: httpx.Response, result: APIInspectResult, findings_set: set) -> None:
        """Detect authentication mechanism from WWW-Authenticate header."""
        headers_lower = {k.lower(): v for k, v in resp.headers.items()}
        www_auth = headers_lower.get("www-authenticate", "")

        if www_auth:
            result.www_authenticate = www_auth[:200]
            wa_upper = www_auth.upper()

            if "NTLM" in wa_upper:
                result.auth_type = "NTLM"
                findings_set.add("NTLM authentication detected — legacy Windows auth, no PQC migration path")
            elif "NEGOTIATE" in wa_upper:
                result.auth_type = "Negotiate-Kerberos"
                findings_set.add("Kerberos/Negotiate auth detected — quantum-vulnerable")
            elif "BEARER" in wa_upper:
                result.auth_type = "Bearer-JWT"
            elif "BASIC" in wa_upper:
                result.auth_type = "Basic"
                findings_set.add("HTTP Basic auth detected — credentials in base64 only")
            else:
                result.auth_type = www_auth[:50]

    def _check_jwt(
        self, resp: httpx.Response, body: str, result: APIInspectResult, findings_set: set
    ) -> None:
        """
        Searches for JWT tokens in:
        1. Authorization / response headers
        2. Response body (JSON or raw)
        3. Set-Cookie headers (JWT in cookie)
        """
        headers_lower = {k.lower(): v for k, v in resp.headers.items()}

        # Check Authorization response hint
        auth_header = headers_lower.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1]
            algo = self._decode_jwt_header(token)
            if algo:
                self._record_jwt(result, algo, "response_header.Authorization", findings_set)
                return

        # Search body for JWT tokens
        jwt_matches = JWT_PATTERN.findall(body)
        if jwt_matches:
            algo = self._decode_jwt_header(jwt_matches[0])
            if algo:
                self._record_jwt(result, algo, "response_body", findings_set)
                return

        # Search body JSON for "alg" field directly
        try:
            data = json.loads(body)
            algo = self._find_alg_in_json(data)
            if algo:
                self._record_jwt(result, algo, "response_body.alg", findings_set)
        except (json.JSONDecodeError, Exception):
            pass

    def _record_jwt(self, result: APIInspectResult, algo: str, loc: str, findings_set: set) -> None:
        # Don't overwrite if we already found a PQC JWT
        if result.jwt_quantum_safe and algo not in PQC_JWT_ALGS:
            return
            
        result.jwt_algorithm = algo
        result.jwt_location = loc
        result.jwt_quantum_safe = algo in PQC_JWT_ALGS
        
        if algo == "none":
            findings_set.add("CRITICAL: JWT 'none' algorithm allowed — signature bypass possible")
        elif algo in VULNERABLE_JWT_ALGS:
            findings_set.add(f"JWT signed with quantum-vulnerable algorithm: {algo}")

    def _decode_jwt_header(self, token: str) -> Optional[str]:
        """Decodes JWT header (no secret needed) and returns alg field."""
        try:
            header_b64 = token.split(".")[0]
            # Add padding if needed
            padding = 4 - len(header_b64) % 4
            if padding != 4:
                header_b64 += "=" * padding
            header_json = base64.urlsafe_b64decode(header_b64).decode("utf-8")
            header = json.loads(header_json)
            return header.get("alg")
        except Exception:
            return None

    def _find_alg_in_json(self, data, depth: int = 0) -> Optional[str]:
        """Recursively searches JSON for 'alg' key with algorithm value."""
        if depth > 5:
            return None
        if isinstance(data, dict):
            if "alg" in data and isinstance(data["alg"], str):
                return data["alg"]
            for v in data.values():
                res = self._find_alg_in_json(v, depth + 1)
                if res:
                    return res
        if isinstance(data, list):
            for item in data[:5]:  # Check first 5 items only
                res = self._find_alg_in_json(item, depth + 1)
                if res:
                    return res
        return None

    def _check_cors(self, resp: httpx.Response, result: APIInspectResult, findings_set: set) -> None:
        """Analyze CORS policy."""
        headers_lower = {k.lower(): v for k, v in resp.headers.items()}
        acao = headers_lower.get("access-control-allow-origin", "")

        if not acao:
            if not result.cors_policy:
                result.cors_policy = "none"
            return

        result.cors_allow_origin = acao
        if acao == "*":
            result.cors_policy = "permissive"
            findings_set.add("Wildcard CORS (Access-Control-Allow-Origin: *) on API endpoint")
        else:
            if result.cors_policy != "permissive":
                result.cors_policy = "restrictive"

    async def _check_graphql(
        self, client: httpx.AsyncClient, base_url: str, result: APIInspectResult, findings_set: set
    ) -> None:
        """Check for exposed GraphQL introspection. Only probe if URL looks like an API."""
        url_lower = base_url.lower()
        if not any(kw in url_lower for kw in ["api", "graphql", "query", "gql"]):
            return

        graphql_paths = ["/graphql", "/api/graphql"]
        introspection_query = '{"query":"{ __schema { types { name } } }"}'

        for path in graphql_paths:
            try:
                url = base_url.rstrip("/") + path
                resp = await client.post(
                    url,
                    content=introspection_query,
                    headers={"Content-Type": "application/json"},
                    timeout=2.0, 
                )
                if resp.status_code == 200 and "__schema" in resp.text:
                    result.graphql_introspection = True
                    result.graphql_endpoint = path
                    findings_set.add(f"GraphQL introspection ENABLED at {path} — full schema exposed")
                    return
            except Exception:
                continue

    def _check_oauth_hints(self, body: str, result: APIInspectResult, findings_set: set) -> None:
        """Check response body for OAuth token endpoint and signing algorithm hints."""
        body_lower = body.lower()
        if "token_endpoint" in body_lower or "oauth" in body_lower:
            # Try to extract signing algorithm from OpenID Connect well-known
            alg_match = re.search(
                r'"id_token_signing_alg_values_supported"\s*:\s*\["([^"]+)"',
                body,
            )
            if alg_match:
                result.oauth_signing_algorithm = alg_match.group(1)
                if result.oauth_signing_algorithm in VULNERABLE_JWT_ALGS:
                    findings_set.add(f"OAuth OIDC signing algorithm exposed: {result.oauth_signing_algorithm}")

    async def _check_well_known(self, client: httpx.AsyncClient, base_url: str, result: APIInspectResult, findings_set: set) -> None:
        """Check for OpenID Connect well-known configuration."""
        well_known_path = "/.well-known/openid-configuration"
        try:
            url = base_url.rstrip("/") + well_known_path
            resp = await client.get(url, timeout=2.0)
            if resp.status_code == 200:
                data = resp.json()
                algs = data.get("id_token_signing_alg_values_supported", [])
                if algs:
                    result.oauth_signing_algorithm = algs[0]
                    vulnerable = [a for a in algs if a in VULNERABLE_JWT_ALGS]
                    if vulnerable:
                        findings_set.add(f"OAuth OIDC supports quantum-vulnerable signing: {', '.join(vulnerable)}")
                token_endpoint = data.get("token_endpoint")
                if token_endpoint:
                    result.oauth_token_endpoint = token_endpoint
                    findings_set.add(f"OAuth token endpoint discovered: {token_endpoint}")
        except Exception:
            pass
