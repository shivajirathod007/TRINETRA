"""
TRINETRA — Hard negative generator for the DistilBERT crypto classifier.

Produces 50 synthetic HTTP responses that contain crypto-adjacent vocabulary but are
NOT evidence of a negotiated algorithm. These target the classifier's known
false-positive surface: `patterns.py` matches substrings without word boundaries, so
"DES" fires inside "Des Moines" and "describes", and "RSA" fires inside
"RSA Conference".

All 50 belong to the CLEAN class (label id 3 in the model config).

Usage:
    python scripts/generate_hard_negatives.py
    python scripts/generate_hard_negatives.py --out ../training_data --count 50
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

COLLECTION_SOURCE = "trinetra_hard_negatives_v1"

HTML_CT = "text/html; charset=utf-8"
JSON_CT = "application/json"
TEXT_CT = "text/plain; charset=utf-8"


def _html(title: str, body: str) -> str:
    return (
        "<!DOCTYPE html><html><head><meta charset=\"utf-8\">"
        f"<title>{title}</title></head><body>{body}</body></html>"
    )


def _headers(content_type: str, extra: dict[str, str] | None = None) -> dict[str, str]:
    headers = {
        "content-type": content_type,
        "server": "nginx",
        "date": "Sun, 07 Sep 2026 12:00:00 GMT",
        "cache-control": "no-cache",
    }
    headers.update(extra or {})
    return headers


# ─────────────────────────────────────────────────────────────────────────────
# The hard negatives, grouped by the false-positive category they exercise
# Each entry: (url, status, content_type, body, note)
# ─────────────────────────────────────────────────────────────────────────────

def _cases() -> list[tuple[str, int, str, str, str]]:
    return [
        # ── 1. Documentation / educational prose about crypto ────────────────
        ("https://blog.example.com/posts/rsa-explained", 200, HTML_CT, _html(
            "How RSA encryption works",
            "<article><h1>How RSA encryption works</h1><p>RSA encryption is widely "
            "used in banking and e-commerce. In this post we explain the intuition "
            "behind public key cryptography without any maths.</p></article>"),
         "blog prose about RSA"),
        ("https://docs.example.com/guides/crypto-101", 200, HTML_CT, _html(
            "Cryptography 101",
            "<p>Students often ask whether MD5 is still safe. It is not. This guide "
            "is a historical overview and does not describe our own systems.</p>"),
         "educational MD5 mention"),
        ("https://wiki.example.org/wiki/Data_Encryption_Standard", 200, HTML_CT, _html(
            "Data Encryption Standard",
            "<p>DES was published in 1977 and superseded by AES. This encyclopedia "
            "article is historical background only.</p>"),
         "encyclopedia article on DES"),
        ("https://learn.example.com/courses/applied-cryptography", 200, HTML_CT, _html(
            "Applied Cryptography course",
            "<p>Module 4 covers ECDSA signatures. Enrolment opens in March.</p>"),
         "course catalogue ECDSA"),
        ("https://blog.example.com/posts/why-sha1-died", 200, HTML_CT, _html(
            "Why SHA1 died",
            "<p>A retrospective on the SHA1 collision attacks of 2017.</p>"),
         "retrospective SHA1"),

        # ── 2. Geographic / place names colliding with cipher names ─────────
        ("https://weather.example.com/us/ia/des-moines", 404, HTML_CT, _html(
            "Not found",
            "<h1>404</h1><p>No forecast available for Des Moines, Iowa. "
            "Try another city.</p>"),
         "Des Moines - geographic DES"),
        ("https://travel.example.com/destinations/des-moines", 200, HTML_CT, _html(
            "Des Moines travel guide",
            "<p>Des Moines is the capital of Iowa. Flights from Des Moines "
            "International Airport serve 20 destinations.</p>"),
         "Des Moines travel"),
        ("https://api.example.com/v1/branches?city=des+moines", 200, JSON_CT, json.dumps({
            "branches": [
                {"id": 41, "city": "Des Moines", "state": "IA", "open": True},
                {"id": 42, "city": "West Des Moines", "state": "IA", "open": False},
            ]
        }), "Des Moines in JSON data"),
        ("https://shop.example.com/stores/desoto", 200, HTML_CT, _html(
            "DeSoto store",
            "<p>Our DeSoto, Texas location is open until 9pm.</p>"),
         "DeSoto place name"),
        ("https://jobs.example.com/openings/des-plaines", 200, HTML_CT, _html(
            "Des Plaines openings",
            "<p>Warehouse roles in Des Plaines, Illinois.</p>"),
         "Des Plaines"),

        # ── 3. Substring collisions inside ordinary English ─────────────────
        ("https://help.example.com/articles/getting-started", 200, HTML_CT, _html(
            "Getting started",
            "<p>This section describes the onboarding flow. It also describes how "
            "roles and modes interact, besides the defaults described above.</p>"),
         "'describes'/'besides' contain DES"),
        ("https://api.example.com/v1/modes", 200, JSON_CT, json.dumps({
            "modes": ["standard", "advanced"],
            "description": "Available rendering modes for the editor",
        }), "'modes'/'description' contain DES"),
        ("https://docs.example.com/reference/nodes", 200, HTML_CT, _html(
            "Nodes reference",
            "<p>Cluster nodes are described in the table below. Each node "
            "provides indexes and modes for query planning.</p>"),
         "'nodes'/'indexes' contain DES"),
        ("https://example.com/vice-versa-policy", 200, HTML_CT, _html(
            "Policy",
            "<p>Refunds apply to annual plans and vice versa for monthly plans.</p>"),
         "'versa' contains RSA"),
        ("https://api.example.com/v1/universal-search", 200, JSON_CT, json.dumps({
            "universal": True, "results": [], "description": "Universal search index"
        }), "'universal' contains RSA"),

        # ── 4. Marketing copy with vague security claims ────────────────────
        ("https://example.com/security", 200, HTML_CT, _html(
            "Security",
            "<h1>Security</h1><p>Our security uses industry-standard encryption "
            "to keep your data safe, both in transit and at rest.</p>"),
         "vague marketing encryption claim"),
        ("https://example.com/pricing", 200, HTML_CT, _html(
            "Pricing",
            "<p>All plans include bank-grade security and end-to-end encryption.</p>"),
         "bank-grade marketing"),
        ("https://example.com/product/vault", 200, HTML_CT, _html(
            "Vault",
            "<p>Enterprise-grade encryption protects every document. "
            "Compliance-ready and audited annually.</p>"),
         "enterprise-grade encryption"),
        ("https://example.com/trust", 200, HTML_CT, _html(
            "Trust centre",
            "<p>We use strong cryptography and follow security best practices.</p>"),
         "generic 'strong cryptography'"),
        ("https://example.com/why-us", 200, HTML_CT, _html(
            "Why us",
            "<p>Military-grade security. Your files are encrypted end to end.</p>"),
         "military-grade claim"),

        # ── 5. "256-bit encryption" with no named algorithm ─────────────────
        ("https://shop.example.com/products/router-x1", 200, HTML_CT, _html(
            "Router X1",
            "<p>The X1 features 256-bit encryption, dual-band WiFi and a 2-year "
            "warranty.</p>"),
         "256-bit, unnamed algorithm"),
        ("https://shop.example.com/products/usb-drive", 200, HTML_CT, _html(
            "Secure USB drive",
            "<p>Hardware 256-bit encryption with a physical keypad.</p>"),
         "256-bit USB drive"),
        ("https://example.com/features/backup", 200, HTML_CT, _html(
            "Backups",
            "<p>Backups are protected with 128-bit encryption at rest.</p>"),
         "128-bit, unnamed"),
        ("https://api.example.com/v1/plans", 200, JSON_CT, json.dumps({
            "plans": [{"name": "pro", "features": ["256-bit encryption", "SSO"]}]
        }), "256-bit in feature list"),
        ("https://shop.example.com/products/nas", 200, HTML_CT, _html(
            "NAS 4-bay",
            "<p>Supports 256-bit encryption for shared folders.</p>"),
         "NAS 256-bit"),

        # ── 6. Generic "description"/"secure access" JSON ────────────────────
        ("https://api.example.com/v1/docs", 200, JSON_CT, json.dumps({
            "name": "Example API",
            "description": "This API provides secure access to customer records",
            "version": "1.4.0",
        }), "generic secure access description"),
        ("https://api.example.com/v1/meta", 200, JSON_CT, json.dumps({
            "service": "billing",
            "description": "Secure, reliable billing operations",
            "status": "ok",
        }), "generic description field"),
        ("https://api.example.com/v1/catalog", 200, JSON_CT, json.dumps({
            "items": [
                {"id": 1, "description": "Encrypted document storage"},
                {"id": 2, "description": "Secure file transfer"},
            ]
        }), "descriptions without algorithms"),

        # ── 7. Crypto words as URL path segments only ───────────────────────
        ("https://example.com/rsa/annual-report", 200, HTML_CT, _html(
            "Annual report",
            "<p>The Retail Sellers Association annual report is available as a "
            "download.</p>"),
         "/rsa/ path, unrelated org"),
        ("https://example.com/des/curriculum", 200, HTML_CT, _html(
            "DES curriculum",
            "<p>Department of Educational Services curriculum overview.</p>"),
         "/des/ path, unrelated dept"),
        ("https://cdn.example.com/assets/rsa/logo.svg.txt", 200, TEXT_CT,
         "Asset placeholder for the /rsa/ brand directory. No binary content.",
         "/rsa/ asset path"),
        ("https://example.com/api/des/reports", 200, JSON_CT, json.dumps({
            "department": "DES", "reports": [], "note": "Data Entry Services"
        }), "/des/ API path"),

        # ── 8. Vendor names / copyright footers ─────────────────────────────
        ("https://example.com/about", 200, HTML_CT, _html(
            "About",
            "<main><p>We build logistics software.</p></main>"
            "<footer>&copy; 2026 Example Ltd. Security auditing by ECDSA Security "
            "Partners LLP. All rights reserved.</footer>"),
         "ECDSA as vendor name in footer"),
        ("https://example.com/partners", 200, HTML_CT, _html(
            "Partners",
            "<footer>Penetration testing provided by Kyber Labs Inc.</footer>"),
         "Kyber as company name"),
        ("https://example.com/press", 200, HTML_CT, _html(
            "Press",
            "<footer>&copy; 2026 Example. Audited by Dilithium Assurance Group.</footer>"),
         "Dilithium as company name"),
        ("https://example.com/legal", 200, HTML_CT, _html(
            "Legal",
            "<footer>RSA Security LLC is a registered trademark of its owner and is "
            "not affiliated with Example Ltd.</footer>"),
         "RSA Security trademark disclaimer"),

        # ── 9. Conference / event names ─────────────────────────────────────
        ("https://events.example.com/rsa-conference-2026", 200, HTML_CT, _html(
            "RSA Conference 2026",
            "<h1>RSA Conference 2026</h1><p>Join us in San Francisco. Booth 1180. "
            "Register before March for early-bird pricing.</p>"),
         "RSA Conference event"),
        ("https://events.example.com/schedule", 200, JSON_CT, json.dumps({
            "events": [
                {"name": "RSA Conference 2026", "city": "San Francisco"},
                {"name": "Black Hat", "city": "Las Vegas"},
            ]
        }), "RSA Conference in JSON"),
        ("https://blog.example.com/posts/recap-rsa-2026", 200, HTML_CT, _html(
            "RSA 2026 recap",
            "<p>Our team's highlights from the RSA Conference show floor.</p>"),
         "conference recap"),

        # ── 10. Load balancing / scheduling "algorithm" fields ──────────────
        ("https://api.example.com/v1/loadbalancer", 200, JSON_CT, json.dumps({
            "algorithm": "round-robin", "healthy_nodes": 4, "sticky_sessions": False
        }), "algorithm=round-robin"),
        ("https://api.example.com/v1/pool/settings", 200, JSON_CT, json.dumps({
            "algorithm": "least-connections", "timeout_ms": 3000
        }), "algorithm=least-connections"),
        ("https://api.example.com/v1/scheduler", 200, JSON_CT, json.dumps({
            "algorithm": "weighted-fair-queueing", "queues": 8
        }), "algorithm=weighted-fair-queueing"),
        ("https://api.example.com/v1/cache/config", 200, JSON_CT, json.dumps({
            "eviction": {"algorithm": "lru", "max_entries": 10000}
        }), "algorithm=lru"),
        ("https://api.example.com/v1/recommendations/config", 200, JSON_CT, json.dumps({
            "algorithm": "collaborative-filtering", "model_version": "2026-03"
        }), "algorithm=collaborative-filtering"),
        ("https://api.example.com/v1/compression", 200, JSON_CT, json.dumps({
            "algorithm": "gzip", "level": 6
        }), "algorithm=gzip"),

        # ── 11. Stack traces naming crypto libraries, no negotiation ────────
        ("https://api.example.com/v1/orders", 500, TEXT_CT,
         "Traceback (most recent call last):\n"
         "  File \"/app/handlers/orders.py\", line 88, in create\n"
         "    resp = client.post(url, json=payload)\n"
         "  File \"/usr/lib/python3.11/site-packages/urllib3/connectionpool.py\", "
         "line 799, in urlopen\n"
         "  File \"/usr/lib/python3.11/site-packages/cryptography/hazmat/backends/"
         "openssl/backend.py\", line 41, in _ensure\n"
         "ConnectionResetError: [Errno 104] Connection reset by peer\n",
         "stack trace naming cryptography lib"),
        ("https://api.example.com/v1/upload", 500, TEXT_CT,
         "java.lang.RuntimeException: upload failed\n"
         "\tat org.bouncycastle.jce.provider.BouncyCastleProvider.<init>"
         "(BouncyCastleProvider.java:200)\n"
         "\tat com.example.UploadService.store(UploadService.java:57)\n",
         "BouncyCastle in stack trace"),
        ("https://api.example.com/v1/sync", 500, TEXT_CT,
         "Error: socket hang up\n"
         "    at TLSSocket.onConnectEnd (node:_tls_wrap:1char)\n"
         "    at Object.openssl_error (node:internal/crypto/util:112:15)\n",
         "node crypto util in trace"),
        ("https://api.example.com/v1/report", 500, JSON_CT, json.dumps({
            "error": "internal_error",
            "trace": "openssl.SSL.Error: unexpected eof while reading",
        }), "openssl error string"),

        # ── 12. Misc realistic negatives ────────────────────────────────────
        ("https://example.com/robots.txt", 200, TEXT_CT,
         "User-agent: *\nDisallow: /admin\nDisallow: /des/\nSitemap: "
         "https://example.com/sitemap.xml\n",
         "robots.txt with /des/ disallow"),
        ("https://status.example.com/api/v1/status", 200, JSON_CT, json.dumps({
            "page": {"name": "Example Status"},
            "status": {"indicator": "none", "description": "All Systems Operational"},
        }), "status page, no crypto"),
        ("https://example.com/careers/security-engineer", 200, HTML_CT, _html(
            "Security Engineer",
            "<p>You will help us modernise cryptography across the estate. "
            "Familiarity with TLS and PKI is a plus.</p>"),
         "job ad mentioning cryptography"),
    ]


def build_record(url: str, status: int, content_type: str, body: str, index: int) -> dict[str, Any]:
    from urllib.parse import urlparse

    domain = urlparse(url).netloc
    # Deterministic, spread-out timestamps so samples are distinguishable
    ts = datetime(2026, 9, 7, 12, 0, 0, tzinfo=timezone.utc) + timedelta(seconds=index * 7)
    return {
        "url": url,
        "method": "GET",
        "status_code": status,
        "response_headers": _headers(content_type),  # real dict[str, str]
        "response_body": body[:3000],
        "content_type": content_type,
        "timestamp": ts.isoformat(),
        "domain": domain,
        "collection_source": COLLECTION_SOURCE,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate hard negative training samples.")
    parser.add_argument(
        "--out",
        default=str(Path(__file__).resolve().parent.parent.parent / "training_data"),
        help="Output directory (default: <repo>/training_data)",
    )
    parser.add_argument("--count", type=int, default=50, help="How many to write (default 50)")
    args = parser.parse_args()

    out_dir = Path(args.out) / "hard_negatives"
    out_dir.mkdir(parents=True, exist_ok=True)

    cases = _cases()
    if len(cases) < args.count:
        raise SystemExit(
            f"only {len(cases)} hard negative cases defined, need {args.count}"
        )
    cases = cases[: args.count]

    written = []
    notes = []
    for i, (url, status, content_type, body, note) in enumerate(cases):
        record = build_record(url, status, content_type, body, i)
        path_hash = hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]
        filename = f"hardneg_{i:03d}_{path_hash}.json"
        (out_dir / filename).write_text(
            json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        written.append(filename)
        notes.append((filename, note))

    print(f"Wrote {len(written)} hard negatives to {out_dir}")
    print("\nCategories covered:")
    for filename, note in notes:
        print(f"  {filename}  {note}")
    print(
        "\nAll are CLEAN (label id 3). They are listed in manifest.csv with "
        "has_crypto_signal=False;\nrun capture_training_data.py afterwards to fold "
        "them into the manifest."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
