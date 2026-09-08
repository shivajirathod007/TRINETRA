"""
TRINETRA — Training data collector for the DistilBERT crypto classifier.

Fetches common endpoints across a list of domains and saves each HTTP response as a
JSON file shaped like `engine.ai.schemas.ClassifierInput`, so collected samples match
what the classifier is written to receive.

Secrets are redacted before anything touches disk (see `redact_headers` /
`redact_body`). Algorithm names (RS256, ECDSA, ML-KEM-768, X25519Kyber768, ...) are
deliberately preserved — they are the classification signal.

Usage:
    python scripts/capture_training_data.py --domains-file targets.txt
    python scripts/capture_training_data.py github.com api.stripe.com
    python scripts/capture_training_data.py --domains-file targets.txt --out ../training_data

Read-only with respect to the rest of the codebase: this script imports
`engine.ai.patterns` only to compute the `has_crypto_signal` hint.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import json
import logging
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Optional

import httpx

# Make `engine.*` importable when run as `python scripts/capture_training_data.py`
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.ai.patterns import CRYPTO_PATTERNS, VULNERABILITY_PATTERNS  # noqa: E402

log = logging.getLogger("capture_training_data")

COLLECTION_SOURCE = "trinetra_collector_v1"

# ── Must stay byte-identical to api_inspector.py so training input matches prod ──
USER_AGENT = "Mozilla/5.0 (compatible; TRINETRA-Scanner/1.0)"
ACCEPT = "application/json, text/html, */*"
REQUEST_HEADERS = {"User-Agent": USER_AGENT, "Accept": ACCEPT}

REQUEST_TIMEOUT = 10.0
MAX_CONCURRENCY = 5
BODY_TRUNCATE_CHARS = 3000

COMMON_PATHS = [
    "/",
    "/api",
    "/api/v1",
    "/health",
    "/login",
    "/oauth/token",
    "/.well-known/openid-configuration",
    "/.well-known/jwks.json",
    "/graphql",
    "/swagger.json",
    "/openapi.json",
    "/robots.txt",
    "/sitemap.xml",
]

# The bare domain is also fetched on these ports
BARE_DOMAIN_PORTS = [443, 8443]

# Only these content types are collected; everything else is skipped as binary
ALLOWED_CONTENT_TYPES = (
    "text/",
    "application/json",
    "application/xml",
)
ALLOWED_CONTENT_TYPE_SUFFIXES = ("+json",)


# ─────────────────────────────────────────────────────────────────────────────
# Step 2 — Secret redaction
# ─────────────────────────────────────────────────────────────────────────────

REDACTED = "[REDACTED]"

# Header names whose values are always redacted (compared case-insensitively)
SENSITIVE_HEADERS = {
    "authorization",
    "proxy-authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "api-key",
    "apikey",
    "x-auth-token",
    "x-authentication-token",
    "x-access-token",
    "x-csrf-token",
    "x-xsrf-token",
    "x-session-token",
    "x-amz-security-token",
    "www-authenticate",
}

# Any header name containing one of these fragments is also redacted
SENSITIVE_HEADER_FRAGMENTS = ("secret", "password", "passwd", "credential")

# JWT: three base64url segments. Captured so we can keep only the `alg`.
JWT_RE = re.compile(r"eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")

BEARER_RE = re.compile(r"Bearer\s+[A-Za-z0-9._-]{20,}")

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")

# 32+ char hex, or long base64-ish runs, used for API keys / secrets.
HEX_KEY_RE = re.compile(r"\b[0-9a-fA-F]{32,}\b")
B64_KEY_RE = re.compile(r"\b[A-Za-z0-9+/_-]{40,}={0,2}\b")

# Digests that carry their algorithm as a prefix must keep that prefix -- it is
# the classification signal. Subresource-Integrity style ("sha512-<b64>") and
# keyid style ("SHA256:<b64>") are redacted to "<alg>-[KEY_REDACTED]" instead
# of being swallowed whole by B64_KEY_RE (which matches "-" and "_").
PREFIXED_DIGEST_RE = re.compile(
    r"\b(sha(?:256|384|512)|sha3-(?:256|384|512)|md5)([-:])[A-Za-z0-9+/_-]{16,}={0,2}",
    re.IGNORECASE,
)

# Algorithm names must survive redaction — they are the classification signal.
# Checked against any candidate before it is replaced with [KEY_REDACTED].
ALGORITHM_ALLOWLIST = re.compile(
    r"^("
    r"RS(256|384|512)|ES(256|384|512|256K)|PS(256|384|512)|HS(256|384|512)|EdDSA|"
    r"RSA(-?\d{3,4})?|RSASSA[-A-Za-z0-9]*|RSAES[-A-Za-z0-9]*|"
    r"ECDSA[-A-Za-z0-9]*|ECDH[E]?[-A-Za-z0-9]*|DHE?[-A-Za-z0-9]*|"
    r"AES(-?\d{3})?([-_](GCM|CBC|CTR|CCM))?|CHACHA20(-POLY1305)?|POLY1305|"
    r"SHA-?\d{1,3}|SHA3(-\d{3})?|MD5|X25519|X448|ED25519|ED448|CURVE25519|"
    r"ML-KEM(-\d{3})?|ML-DSA(-\d{2})?|KYBER\d*|DILITHIUM\d*|SPHINCS\+?|SLH-DSA|"
    r"FALCON(-\d{3})?|BIKE|HQC|X25519KYBER768(D00)?|X25519MLKEM768|SECP\d{3}R1|"
    r"P-(256|384|521)|BRAINPOOLP\d+R1|3?DES|RC4|BLOWFISH|TWOFISH|CAMELLIA(\d{3})?|"
    r"PBKDF2|BCRYPT|SCRYPT|ARGON2(ID|I|D)?|HKDF|HMAC(-SHA\d+)?|NTLM|KERBEROS"
    r")$",
    re.IGNORECASE,
)


class RedactionCounter:
    """Tallies redactions so the run report can state what was removed."""

    def __init__(self) -> None:
        self.counts: Counter = Counter()

    def bump(self, kind: str, n: int = 1) -> None:
        if n:
            self.counts[kind] += n

    def total(self) -> int:
        return sum(self.counts.values())

    def as_dict(self) -> dict[str, int]:
        return dict(self.counts)


def _is_sensitive_header(name: str) -> bool:
    lowered = name.lower()
    if lowered in SENSITIVE_HEADERS:
        return True
    return any(frag in lowered for frag in SENSITIVE_HEADER_FRAGMENTS)


def redact_headers(
    headers: dict[str, str], counter: Optional[RedactionCounter] = None
) -> dict[str, str]:
    """
    Return a new dict with sensitive header values replaced.

    Always returns `dict[str, str]` — this is the type `ClassifierInput.response_headers`
    declares, and the collector must never emit a stringified dict.
    """
    counter = counter or RedactionCounter()
    out: dict[str, str] = {}
    for key, value in headers.items():
        key = str(key)
        value = str(value)
        if _is_sensitive_header(key):
            out[key] = REDACTED
            counter.bump("header")
        else:
            # A token can still appear in a non-sensitive header (e.g. Location)
            out[key] = redact_body(value, counter)
    return out


def _jwt_alg(token: str) -> Optional[str]:
    """Decode a JWT header segment and return its `alg`, or None."""
    import base64

    try:
        header_b64 = token.split(".", 1)[0]
        padding = "=" * (-len(header_b64) % 4)
        decoded = base64.urlsafe_b64decode(header_b64 + padding)
        alg = json.loads(decoded).get("alg")
        if isinstance(alg, str) and re.fullmatch(r"[A-Za-z0-9._+-]{1,32}", alg):
            return alg
    except Exception:
        pass
    return None


def _looks_like_algorithm(candidate: str) -> bool:
    return bool(ALGORITHM_ALLOWLIST.match(candidate))


def redact_body(text: str, counter: Optional[RedactionCounter] = None) -> str:
    """
    Redact secrets from a response body while preserving algorithm names.

    Order matters: JWTs are handled before generic key patterns, so a JWT is replaced
    by `[JWT alg=RS256]` rather than being swallowed as an opaque key.
    """
    if not text:
        return text
    counter = counter or RedactionCounter()

    # 1. JWTs -> keep only the algorithm, which is the signal we want to train on
    def _sub_jwt(m: re.Match) -> str:
        alg = _jwt_alg(m.group(0))
        counter.bump("jwt")
        return f"[JWT alg={alg}]" if alg else "[JWT alg=UNKNOWN]"

    text = JWT_RE.sub(_sub_jwt, text)

    # 2. Bearer tokens
    def _sub_bearer(m: re.Match) -> str:
        counter.bump("bearer")
        return "Bearer [REDACTED_TOKEN]"

    text = BEARER_RE.sub(_sub_bearer, text)

    # 3. Email addresses
    def _sub_email(m: re.Match) -> str:
        counter.bump("email")
        return "[EMAIL_REDACTED]"

    text = EMAIL_RE.sub(_sub_email, text)

    # 4. Digests that name their own algorithm -- keep the algorithm, drop the digest
    def _sub_prefixed_digest(m: re.Match) -> str:
        counter.bump("key")
        return f"{m.group(1)}{m.group(2)}[KEY_REDACTED]"

    text = PREFIXED_DIGEST_RE.sub(_sub_prefixed_digest, text)

    # 5. Long hex / base64 runs that look like API keys, unless they are algorithm names
    def _sub_key(m: re.Match) -> str:
        candidate = m.group(0)
        if _looks_like_algorithm(candidate):
            return candidate
        counter.bump("key")
        return "[KEY_REDACTED]"

    text = HEX_KEY_RE.sub(_sub_key, text)
    text = B64_KEY_RE.sub(_sub_key, text)

    return text


# ─────────────────────────────────────────────────────────────────────────────
# Crypto-signal hint (uses the classifier's own regexes, deliberately)
# ─────────────────────────────────────────────────────────────────────────────

def has_crypto_signal(headers: dict[str, str], body: str) -> bool:
    """
    True if the classifier's own regex pre-pass would fire on this sample.

    Uses CRYPTO_PATTERNS / VULNERABILITY_PATTERNS verbatim, against the same combined
    text `preprocess_response` builds, so the hint reflects real classifier behaviour
    -- including its substring false positives ("DES" inside "describes").
    """
    header_str = " | ".join(f"{k}: {v}" for k, v in (headers or {}).items())
    combined = f"HEADERS: {header_str}\nBODY: {body or ''}"
    for pattern in list(CRYPTO_PATTERNS.values()) + list(VULNERABILITY_PATTERNS.values()):
        if pattern.search(combined):
            return True
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Content-type filtering
# ─────────────────────────────────────────────────────────────────────────────

def is_collectable_content_type(content_type: str) -> bool:
    """True for text-like responses; False for images, PDFs, archives, binaries."""
    if not content_type:
        return False
    ct = content_type.split(";", 1)[0].strip().lower()
    if not ct:
        return False
    if ct.endswith(ALLOWED_CONTENT_TYPE_SUFFIXES):
        return True
    return ct.startswith(ALLOWED_CONTENT_TYPES)


# ─────────────────────────────────────────────────────────────────────────────
# Collection
# ─────────────────────────────────────────────────────────────────────────────

def truncate_body(text: str, limit: int = BODY_TRUNCATE_CHARS) -> str:
    return (text or "")[:limit]


def build_targets(domains: Iterable[str]) -> list[tuple[str, str]]:
    """Return (domain, url) pairs for every path and port to fetch."""
    targets: list[tuple[str, str]] = []
    for domain in domains:
        domain = domain.strip()
        if not domain or domain.startswith("#"):
            continue
        domain = re.sub(r"^https?://", "", domain).rstrip("/")
        for path in COMMON_PATHS:
            targets.append((domain, f"https://{domain}{path}"))
        for port in BARE_DOMAIN_PORTS:
            targets.append((domain, f"https://{domain}:{port}/"))
    return targets


def response_filename(domain: str, url: str, timestamp: datetime) -> str:
    path_hash = hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]
    safe_domain = re.sub(r"[^A-Za-z0-9._-]", "_", domain)
    ts = timestamp.strftime("%Y%m%dT%H%M%S%f")[:-3]
    return f"{safe_domain}_{path_hash}_{ts}.json"


def build_record(
    *,
    url: str,
    domain: str,
    status_code: int,
    headers: dict[str, str],
    body: str,
    content_type: str,
    method: str = "GET",
    timestamp: Optional[datetime] = None,
) -> dict[str, Any]:
    """Assemble one training sample in the on-disk schema."""
    return {
        "url": url,
        "method": method,
        "status_code": status_code,
        "response_headers": headers,  # real dict[str, str], never str()
        "response_body": body,
        "content_type": content_type,
        "timestamp": (timestamp or datetime.now(timezone.utc)).isoformat(),
        "domain": domain,
        "collection_source": COLLECTION_SOURCE,
    }


class Collector:
    def __init__(self, out_dir: Path) -> None:
        self.out_dir = out_dir
        self.raw_dir = out_dir / "raw_responses"
        self.raw_dir.mkdir(parents=True, exist_ok=True)

        self.redactions = RedactionCounter()
        self.records: list[dict[str, Any]] = []      # manifest rows
        self.skips: list[tuple[str, str]] = []       # (url, reason)
        self.reached_domains: set[str] = set()
        self.failed_domains: set[str] = set()
        self.content_types: Counter = Counter()
        self.saved_files: list[Path] = []

    def skip(self, url: str, reason: str) -> None:
        self.skips.append((url, reason))
        log.info("skip url=%s reason=%s", url, reason)

    async def fetch_one(
        self, client: httpx.AsyncClient, sem: asyncio.Semaphore, domain: str, url: str
    ) -> None:
        async with sem:
            resp = await self._request_with_retry(client, domain, url)
            if resp is None:
                return

            content_type = resp.headers.get("content-type", "")
            if not is_collectable_content_type(content_type):
                self.skip(url, f"non_text_content_type:{content_type or 'missing'}")
                return

            try:
                raw_body = resp.text
            except Exception as exc:  # undecodable payload
                self.skip(url, f"body_decode_error:{type(exc).__name__}")
                return

            headers = redact_headers(dict(resp.headers), self.redactions)
            body = redact_body(truncate_body(raw_body), self.redactions)

            timestamp = datetime.now(timezone.utc)
            record = build_record(
                url=url,
                domain=domain,
                status_code=resp.status_code,
                headers=headers,
                body=body,
                content_type=content_type,
                timestamp=timestamp,
            )

            filename = response_filename(domain, url, timestamp)
            (self.raw_dir / filename).write_text(
                json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8"
            )
            self.saved_files.append(self.raw_dir / filename)
            self.content_types[content_type.split(";", 1)[0].strip().lower()] += 1
            self.reached_domains.add(domain)

            self.records.append(
                {
                    "filename": filename,
                    "domain": domain,
                    "url": url,
                    "status_code": resp.status_code,
                    "content_type": content_type,
                    "has_crypto_signal": has_crypto_signal(headers, body),
                    "label": "",  # filled in manually
                }
            )

    async def _request_with_retry(
        self, client: httpx.AsyncClient, domain: str, url: str
    ) -> Optional[httpx.Response]:
        """GET with one retry on 5xx; connection errors are logged and skipped."""
        for attempt in (1, 2):
            try:
                resp = await client.get(url, headers=REQUEST_HEADERS)
            except httpx.TimeoutException:
                self.skip(url, "timeout")
                self.failed_domains.add(domain)
                return None
            except (httpx.ConnectError, httpx.NetworkError) as exc:
                self.skip(url, f"connection_error:{type(exc).__name__}")
                self.failed_domains.add(domain)
                return None
            except Exception as exc:
                self.skip(url, f"request_error:{type(exc).__name__}")
                self.failed_domains.add(domain)
                return None

            if resp.status_code >= 500 and attempt == 1:
                log.info("retrying url=%s status=%s", url, resp.status_code)
                continue
            return resp
        return resp

    async def run(self, domains: list[str]) -> None:
        targets = build_targets(domains)
        log.info("collecting targets=%d domains=%d", len(targets), len(domains))

        sem = asyncio.Semaphore(MAX_CONCURRENCY)
        # Mirrors api_inspector.py's client configuration
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(REQUEST_TIMEOUT, connect=4.0),
            verify=False,
            follow_redirects=True,
        ) as client:
            await asyncio.gather(
                *(self.fetch_one(client, sem, d, u) for d, u in targets)
            )

        # A domain that produced at least one response is "reached"
        self.failed_domains -= self.reached_domains

    def write_manifest(self, extra_rows: Optional[list[dict[str, Any]]] = None) -> Path:
        manifest = self.out_dir / "manifest.csv"
        rows = self.records + list(extra_rows or [])
        with manifest.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(
                fh,
                fieldnames=[
                    "filename",
                    "domain",
                    "url",
                    "status_code",
                    "content_type",
                    "has_crypto_signal",
                    "label",
                ],
            )
            writer.writeheader()
            writer.writerows(rows)
        return manifest


# ─────────────────────────────────────────────────────────────────────────────
# Reporting
# ─────────────────────────────────────────────────────────────────────────────

def print_report(collector: Collector, domains: list[str], hard_negatives: int) -> None:
    signal_true = sum(1 for r in collector.records if r["has_crypto_signal"])
    signal_false = len(collector.records) - signal_true

    print("\n" + "=" * 72)
    print("TRINETRA TRAINING DATA COLLECTION REPORT")
    print("=" * 72)

    print(f"\nTotal responses collected      : {len(collector.records)}")
    print(f"Responses skipped              : {len(collector.skips)}")
    print(f"With crypto signals (True)     : {signal_true}")
    print(f"Without crypto signals (False) : {signal_false}")
    print(f"Hard negatives generated       : {hard_negatives}")

    print(f"\nDomains reached  : {len(collector.reached_domains)} / {len(domains)}")
    print(f"Domains failed   : {len(collector.failed_domains)}")
    if collector.failed_domains:
        for d in sorted(collector.failed_domains):
            print(f"    - {d}")

    if collector.skips:
        print("\nSkip reasons:")
        reasons = Counter(reason.split(":", 1)[0] for _, reason in collector.skips)
        for reason, count in reasons.most_common():
            print(f"    {reason:<32} {count}")

    print("\nContent type distribution:")
    for ct, count in collector.content_types.most_common():
        print(f"    {ct:<40} {count}")

    print(f"\nRedactions applied (total: {collector.redactions.total()}):")
    if collector.redactions.total():
        for kind, count in sorted(collector.redactions.as_dict().items()):
            print(f"    {kind:<32} {count}")
    else:
        print("    none")

    print("\n" + "-" * 72)
    print("SAMPLE OF 3 COLLECTED RESPONSES (redacted)")
    print("-" * 72)
    for path in collector.saved_files[:3]:
        record = json.loads(path.read_text(encoding="utf-8"))
        # Keep the printed sample readable
        record["response_body"] = record["response_body"][:400] + (
            " ...[truncated for display]" if len(record["response_body"]) > 400 else ""
        )
        print(f"\n--- {path.name}")
        print(json.dumps(record, indent=2, ensure_ascii=False)[:1800])
    print("\n" + "=" * 72)


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def load_domains(args: argparse.Namespace) -> list[str]:
    if args.domains_file:
        text = Path(args.domains_file).read_text(encoding="utf-8")
        return [
            line.strip()
            for line in text.splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]
    return list(args.domains)


def count_hard_negatives(out_dir: Path) -> tuple[int, list[dict[str, Any]]]:
    """Pick up hard negatives if generate_hard_negatives.py has already run."""
    hn_dir = out_dir / "hard_negatives"
    if not hn_dir.is_dir():
        return 0, []
    rows: list[dict[str, Any]] = []
    files = sorted(hn_dir.glob("*.json"))
    for path in files:
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        rows.append(
            {
                "filename": f"hard_negatives/{path.name}",
                "domain": record.get("domain", ""),
                "url": record.get("url", ""),
                "status_code": record.get("status_code", ""),
                "content_type": record.get("content_type", ""),
                "has_crypto_signal": False,  # hard negatives are negatives by definition
                "label": "",
            }
        )
    return len(files), rows


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Collect HTTP responses as training data for the crypto classifier."
    )
    parser.add_argument("domains", nargs="*", help="Domains to collect (or use --domains-file)")
    parser.add_argument("--domains-file", help="Text file with one domain per line")
    parser.add_argument(
        "--out",
        default=str(Path(__file__).resolve().parent.parent.parent / "training_data"),
        help="Output directory (default: <repo>/training_data)",
    )
    parser.add_argument("--verbose", action="store_true", help="Log every skip")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO if args.verbose else logging.WARNING,
        format="%(levelname)s %(message)s",
    )

    domains = load_domains(args)
    if not domains:
        parser.error("no domains given — pass them as arguments or use --domains-file")

    out_dir = Path(args.out)
    collector = Collector(out_dir)

    asyncio.run(collector.run(domains))

    hn_count, hn_rows = count_hard_negatives(out_dir)
    manifest = collector.write_manifest(hn_rows)

    print_report(collector, domains, hn_count)
    print(f"\nRaw responses : {collector.raw_dir}")
    print(f"Manifest      : {manifest}  ({len(collector.records) + len(hn_rows)} rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
