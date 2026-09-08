"""
TRINETRA — Deterministic auto-labeller for collected training data.

Assigns one of the classifier's four classes to every row in
`training_data/manifest.csv`, using *where* a crypto term appears rather than
whether it appears at all.

The distinction that matters:

    {"alg": "RS256"}                     -> protocol evidence  -> QUANTUM_VULNERABLE
    "<p>RSA encryption is widely used"   -> prose              -> CLEAN
    "/rsa/pricing"                       -> path segment       -> CLEAN

Priority order (first match wins):
    PQC_READY > QUANTUM_VULNERABLE > CLASSICAL_SAFE > CLEAN

Labels match `loaded_model/crypto_classifier/config.json` exactly.

Usage:
    python scripts/auto_label.py
    python scripts/auto_label.py --data-dir ../training_data
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Optional

LABELS = ("QUANTUM_VULNERABLE", "CLASSICAL_SAFE", "PQC_READY", "CLEAN")

# ─────────────────────────────────────────────────────────────────────────────
# Vocabularies
# ─────────────────────────────────────────────────────────────────────────────

PQC_TERMS = re.compile(
    r"(ML-KEM(?:-\d{3})?|ML-DSA(?:-\d{2})?|CRYSTALS[-_]?KYBER|CRYSTALS[-_]?DILITHIUM"
    r"|KYBER\d*|DILITHIUM\d*|SPHINCS\+?|SLH-DSA|X25519KYBER768(?:D00)?|X25519MLKEM768"
    r"|FALCON-?\d{3}|\bBIKE\b|\bHQC\b)",
    re.IGNORECASE,
)

QV_TERMS = re.compile(
    r"(\bRS(?:256|384|512)\b|\bES(?:256|384|512|256K)\b|\bPS(?:256|384|512)\b"
    r"|\bRSA(?:-\d{3,4})?\b|RSASSA[-A-Z0-9]*|RSAES[-A-Z0-9]*"
    r"|\bECDSA\b|\bECDHE?\b|\bDHE?\b|\bDSA\b"
    r"|\bNTLM\b|\bNegotiate\b|\bKerberos\b"
    r"|\bMD5\b|\bSHA-?1\b|\b3?DES\b|\bRC4\b|PKCS#?1)",
    re.IGNORECASE,
)

CS_TERMS = re.compile(
    r"(\bAES-?(?:128|192|256)(?:[-_](?:GCM|CBC|CTR|CCM))?\b|\bAES-GCM\b"
    r"|\bCHACHA20(?:-POLY1305)?\b|\bPOLY1305\b"
    r"|\bSHA-?(?:256|384|512)\b|\bSHA3-\d{3}\b"
    r"|\bED25519\b|\bED448\b|\bEDDSA\b|\bX25519\b|\bX448\b|\bCURVE25519\b"
    r"|\bHS(?:256|384|512)\b)",
    re.IGNORECASE,
)

# Subresource Integrity attributes name a hash algorithm that is actually in use
# to verify an asset. That is a W3C security context, not prose. SRI only permits
# sha256/384/512, all of which are classical-safe.
SRI_ATTR_RE = re.compile(
    r'''integrity\s*=\s*["']((?:\s*sha(?:256|384|512)-[^"']*)+)["']''',
    re.IGNORECASE,
)
SRI_ALG_RE = re.compile(r"sha(?:256|384|512)", re.IGNORECASE)

# Cipher suite names are never prose
CIPHER_SUITE_RE = re.compile(r"\b(TLS_[A-Z0-9_]{4,}|ECDHE-[A-Z0-9-]{4,}|DHE-[A-Z0-9-]{4,})\b")

# JSON keys whose *values* constitute protocol evidence
CRYPTO_KEY_RE = re.compile(
    r"^(alg|algorithm|algorithms|kty|key_type|keytype|crv|curve|cipher|ciphers"
    r"|cipher_suite|cipher_suites|ciphersuite|enc|encryption|signing_method"
    r"|signing_alg|signature_algorithm|hash_algorithm|hash_alg|key_algorithm"
    r"|kem|kex|key_exchange|keyid|kid_alg|integrity|shasum|checksum|digest"
    r"|hash|hashes|digest_algorithm|token_endpoint_auth_signing_alg_values_supported"
    r"|id_token_signing_alg_values_supported|request_object_signing_alg_values_supported"
    r"|userinfo_signing_alg_values_supported|introspection_signing_alg_values_supported"
    r"|dpop_signing_alg_values_supported|.*_signing_alg_values_supported"
    r"|.*_encryption_alg_values_supported|.*_encryption_enc_values_supported)$",
    re.IGNORECASE,
)

# Security-relevant headers whose values constitute protocol evidence
SECURITY_HEADER_RE = re.compile(
    r"^(www-authenticate|proxy-authenticate|public-key-pins|public-key-pins-report-only"
    r"|strict-transport-security|x-[a-z0-9-]*(auth|sign|crypto|algorithm|cipher)[a-z0-9-]*"
    r"|authorization-algorithm|signature|signature-input|content-signature)$",
    re.IGNORECASE,
)

# Headers whose crypto-looking values are NOT security evidence
NON_SECURITY_HEADER_RE = re.compile(r"^(etag|content-md5|x-checksum[a-z0-9-]*)$", re.IGNORECASE)

# Prose giveaways — verbs/phrasing that mark documentation or marketing
PROSE_VERB_RE = re.compile(
    r"\b(is|are|was|were|be|been)\s+(widely\s+)?(used|considered|known|deprecated|broken"
    r"|supported|recommended|superseded|published)\b"
    r"|\b(provides?|enables?|supports?|explains?|describes?|covers?|discusses?"
    r"|introduces?|teaches?|offers?|protects?|ensures?)\b"
    r"|\b(industry-standard|bank-grade|military-grade|enterprise-grade|best practices)\b",
    re.IGNORECASE,
)

HTML_TEXT_TAG_RE = re.compile(
    r"<(p|span|div|li|h[1-6]|footer|article|small|td|blockquote)\b[^>]*>(.*?)</\1>",
    re.IGNORECASE | re.DOTALL,
)

HTML_TAG_STRIP_RE = re.compile(r"<[^>]+>")


# ─────────────────────────────────────────────────────────────────────────────
# JSON extraction
# ─────────────────────────────────────────────────────────────────────────────

def _iter_json_objects(text: str) -> Iterable[Any]:
    """Yield parsed JSON from the body, whether it is the whole body or embedded."""
    stripped = (text or "").strip()
    if not stripped:
        return
    for candidate in (stripped,):
        if candidate[:1] in "{[":
            try:
                yield json.loads(candidate)
                return
            except Exception:
                pass
    # Embedded JSON blobs (e.g. inside <script type="application/json">)
    for m in re.finditer(r"\{(?:[^{}]|\{[^{}]*\})*\}", stripped[:20000]):
        try:
            yield json.loads(m.group(0))
        except Exception:
            continue


def extract_json_key_values(body: str) -> list[tuple[str, str]]:
    """
    Recursively flatten JSON into (key, scalar-value-as-str) pairs.

    List values are expanded so `["RS256","ES256"]` yields one pair per entry,
    with the owning key preserved.
    """
    pairs: list[tuple[str, str]] = []

    def walk(node: Any, key: Optional[str]) -> None:
        if isinstance(node, dict):
            for k, v in node.items():
                walk(v, str(k))
        elif isinstance(node, list):
            for item in node:
                walk(item, key)
        else:
            if key is not None and node is not None and not isinstance(node, bool):
                pairs.append((key, str(node)))

    for obj in _iter_json_objects(body):
        walk(obj, None)
    return pairs


# ─────────────────────────────────────────────────────────────────────────────
# Context classification
# ─────────────────────────────────────────────────────────────────────────────

def prose_spans(body: str) -> str:
    """Concatenated natural-language text from HTML block tags."""
    chunks = [HTML_TAG_STRIP_RE.sub(" ", m.group(2)) for m in HTML_TEXT_TAG_RE.finditer(body or "")]
    return " ".join(chunks)


def is_prose_only(term: str, body: str) -> bool:
    """
    True when every occurrence of `term` sits in prose, a URL path, or a footer.

    Used to demote apparent matches that are documentation or marketing.
    """
    if not body:
        return False
    occurrences = [m.start() for m in re.finditer(re.escape(term), body, re.IGNORECASE)]
    if not occurrences:
        return False

    prose = prose_spans(body)
    prose_has = bool(re.search(re.escape(term), prose, re.IGNORECASE))

    for pos in occurrences:
        window = body[max(0, pos - 120): pos + 120]
        # Inside a URL/path/query -> not evidence
        if re.search(r'(https?://|href=|src=|"/|\s/)[^\s"\']*' + re.escape(term), window, re.IGNORECASE):
            continue
        # Sentence-like context with prose verbs -> not evidence
        if PROSE_VERB_RE.search(window):
            continue
        # Inside a block tag we already collected as prose
        if prose_has and re.search(re.escape(term), prose, re.IGNORECASE):
            # Only treat as prose if this occurrence is not adjacent to a JSON key
            if not re.search(r'"\s*:\s*"?[^"]*' + re.escape(term), window, re.IGNORECASE):
                continue
        return False  # at least one occurrence looks like real evidence
    return True


def _match(pattern: re.Pattern, text: str) -> Optional[str]:
    m = pattern.search(text or "")
    return m.group(0) if m else None


def scan_protocol_contexts(
    headers: dict[str, str], body: str, json_pairs: list[tuple[str, str]]
) -> dict[str, list[tuple[str, str, str]]]:
    """
    Find crypto terms that appear in genuine protocol contexts.

    Returns {"PQC": [...], "QV": [...], "CS": [...]} where each entry is
    (matched_term, location, detail).
    """
    found: dict[str, list[tuple[str, str, str]]] = {"PQC": [], "QV": [], "CS": []}

    def record(bucket: str, term: str, location: str, detail: str) -> None:
        found[bucket].append((term, location, detail))

    # ── 1. JSON values under crypto-relevant keys ───────────────────────────
    for key, value in json_pairs:
        if not CRYPTO_KEY_RE.match(key):
            continue
        for bucket, pattern in (("PQC", PQC_TERMS), ("QV", QV_TERMS), ("CS", CS_TERMS)):
            hit = _match(pattern, value)
            if hit:
                record(bucket, hit, f'json:"{key}"', f'"{key}": "{value[:60]}"')

    # ── 2. Security-relevant header values ──────────────────────────────────
    for name, value in (headers or {}).items():
        if NON_SECURITY_HEADER_RE.match(name):
            continue  # ETag / Content-MD5 are not security uses
        if not SECURITY_HEADER_RE.match(name):
            continue
        for bucket, pattern in (("PQC", PQC_TERMS), ("QV", QV_TERMS), ("CS", CS_TERMS)):
            hit = _match(pattern, value)
            if hit:
                record(bucket, hit, f"header:{name}", f"{name}: {value[:60]}")

    # ── 3. Cipher suite names anywhere (never prose) ────────────────────────
    for m in CIPHER_SUITE_RE.finditer(body or ""):
        suite = m.group(0)
        if PQC_TERMS.search(suite):
            record("PQC", suite, "cipher_suite", suite)
        elif QV_TERMS.search(suite):
            record("QV", suite, "cipher_suite", suite)
        elif CS_TERMS.search(suite):
            record("CS", suite, "cipher_suite", suite)
    for name, value in (headers or {}).items():
        for m in CIPHER_SUITE_RE.finditer(value or ""):
            suite = m.group(0)
            bucket = "PQC" if PQC_TERMS.search(suite) else "QV" if QV_TERMS.search(suite) else "CS" if CS_TERMS.search(suite) else None
            if bucket:
                record(bucket, suite, f"cipher_suite:header:{name}", suite)

    # ── 4. Subresource Integrity attributes in HTML ─────────────────────────
    for m in SRI_ATTR_RE.finditer(body or ""):
        algs = SRI_ALG_RE.findall(m.group(1))
        if algs:
            record("CS", algs[0].upper(), "html:integrity",
                   'integrity="' + m.group(1).strip()[:60] + '"')

    # ── 5. JWKS: kty/crv are protocol evidence even without an alg ──────────
    for key, value in json_pairs:
        if key.lower() in ("kty", "crv") and value:
            if PQC_TERMS.search(value):
                record("PQC", value, f'jwks:"{key}"', f'"{key}": "{value}"')
            elif value.upper() in ("RSA", "EC"):
                record("QV", value.upper(), f'jwks:"{key}"', f'"{key}": "{value}"')
            elif value.upper() in ("OKP",) or CS_TERMS.search(value):
                record("CS", value, f'jwks:"{key}"', f'"{key}": "{value}"')

    return found


def label_sample(headers: dict[str, str], body: str) -> tuple[str, str]:
    """
    Return (label, evidence) for one response.

    The weakest link determines the label: a sample containing both RSA and
    AES-256 is QUANTUM_VULNERABLE.
    """
    json_pairs = extract_json_key_values(body)
    found = scan_protocol_contexts(headers, body, json_pairs)

    # Drop matches whose every occurrence is prose/path
    def filtered(bucket: str) -> list[tuple[str, str, str]]:
        out = []
        for term, location, detail in found[bucket]:
            if location.startswith(("json", "header", "cipher_suite", "jwks", "html:")):
                out.append((term, location, detail))  # already a protocol context
            elif not is_prose_only(term, body):
                out.append((term, location, detail))
        return out

    pqc, qv, cs = filtered("PQC"), filtered("QV"), filtered("CS")

    if pqc:
        term, location, detail = pqc[0]
        return "PQC_READY", f"matched '{term}' in {location} | {detail}"
    if qv:
        term, location, detail = qv[0]
        extra = f" (also classical: {cs[0][0]})" if cs else ""
        return "QUANTUM_VULNERABLE", f"matched '{term}' in {location} | {detail}{extra}"
    if cs:
        term, location, detail = cs[0]
        return "CLASSICAL_SAFE", f"matched '{term}' in {location} | {detail}"

    # Nothing in a protocol context. Say why, if a term appeared in prose.
    for pattern, name in ((PQC_TERMS, "PQC"), (QV_TERMS, "QV"), (CS_TERMS, "CS")):
        hit = _match(pattern, body)
        if hit:
            return "CLEAN", f"'{hit}' present but only in prose/path context (no protocol evidence)"
    return "CLEAN", "no crypto evidence"


def is_uncertain(headers: dict[str, str], body: str) -> Optional[str]:
    """Flag samples where signals point at more than one class."""
    json_pairs = extract_json_key_values(body)
    found = scan_protocol_contexts(headers, body, json_pairs)
    buckets = [b for b in ("PQC", "QV", "CS") if found[b]]
    if len(buckets) > 1:
        detail = "; ".join(f"{b}={found[b][0][0]}" for b in buckets)
        return f"multiple signal classes: {detail}"
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Synthetic PQC_READY generation (only when the class is empty)
# ─────────────────────────────────────────────────────────────────────────────

def generate_synthetic_pqc(out_dir: Path, count: int = 20) -> list[dict[str, Any]]:
    """Write `count` synthetic PQC_READY samples; return manifest rows."""
    out_dir.mkdir(parents=True, exist_ok=True)

    kems = ["ML-KEM-512", "ML-KEM-768", "ML-KEM-1024", "X25519Kyber768", "X25519MLKEM768"]
    sigs = ["ML-DSA-44", "ML-DSA-65", "ML-DSA-87", "SLH-DSA-SHA2-128s", "Falcon-512"]
    suites = [
        "TLS_ML_KEM_768_AES_256_GCM_SHA384",
        "TLS_AES_256_GCM_SHA384_X25519KYBER768",
        "TLS_KYBER768_AES_128_GCM_SHA256",
    ]

    rows: list[dict[str, Any]] = []
    for i in range(count):
        kem, sig, suite = kems[i % len(kems)], sigs[i % len(sigs)], suites[i % len(suites)]
        kind = i % 4
        if kind == 0:  # JWKS
            url = f"https://pqc-{i:02d}.example.com/.well-known/jwks.json"
            body = json.dumps({"keys": [
                {"use": "sig", "kty": sig.split("-")[0].upper(), "alg": sig,
                 "kid": f"pqc-key-{i}", "pub": "[KEY_REDACTED]"}]})
            ct = "application/json"
        elif kind == 1:  # OpenID configuration
            url = f"https://pqc-{i:02d}.example.com/.well-known/openid-configuration"
            body = json.dumps({
                "issuer": f"https://pqc-{i:02d}.example.com",
                "id_token_signing_alg_values_supported": [sig],
                "request_object_signing_alg_values_supported": [sig],
            })
            ct = "application/json"
        elif kind == 2:  # TLS/cipher status endpoint
            url = f"https://pqc-{i:02d}.example.com/api/v1/tls-status"
            body = json.dumps({
                "tls_version": "TLS1.3", "cipher_suite": suite,
                "key_exchange": kem, "signature_algorithm": sig,
            })
            ct = "application/json"
        else:  # crypto policy endpoint
            url = f"https://pqc-{i:02d}.example.com/api/v1/crypto-policy"
            body = json.dumps({
                "kem": kem, "algorithm": sig, "hybrid": True,
                "nist_level": 3, "policy": "pqc-hybrid-2026",
            })
            ct = "application/json"

        record = {
            "url": url,
            "method": "GET",
            "status_code": 200,
            "response_headers": {
                "content-type": ct,
                "server": "nginx",
                "x-crypto-algorithm": f"{kem}+{sig}",
            },
            "response_body": body[:3000],
            "content_type": ct,
            "timestamp": datetime(2026, 9, 8, tzinfo=timezone.utc).isoformat(),
            "domain": f"pqc-{i:02d}.example.com",
            "collection_source": "synthetic_pqc",
        }
        filename = f"synthpqc_{i:03d}.json"
        (out_dir / filename).write_text(json.dumps(record, indent=2), encoding="utf-8")

        rows.append({
            "filename": f"synthetic_pqc/{filename}",
            "domain": record["domain"],
            "url": url,
            "status_code": 200,
            "content_type": ct,
            "has_crypto_signal": True,
            "label": "PQC_READY",
            "label_evidence": f"synthetic: {kem} / {sig} in protocol fields",
        })
    return rows


# ─────────────────────────────────────────────────────────────────────────────
# Driver
# ─────────────────────────────────────────────────────────────────────────────

def load_record(data_dir: Path, filename: str) -> Optional[dict[str, Any]]:
    path = data_dir / filename if "/" in filename else data_dir / "raw_responses" / filename
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def write_report(
    data_dir: Path,
    rows: list[dict[str, Any]],
    counts: Counter,
    uncertain: list[tuple[str, str, str]],
    prose_saves: list[tuple[str, str]],
    examples: dict[str, list[tuple[str, str, str]]],
    warnings: list[str],
    synth: int,
) -> Path:
    lines: list[str] = []
    lines.append("# TRINETRA — Auto-labelling Report\n")
    lines.append(f"Generated: {datetime.now(timezone.utc).isoformat()}\n")
    lines.append(f"**Total samples labelled: {len(rows)}**\n")

    lines.append("\n## Class distribution\n")
    lines.append("| Label | Count | % |")
    lines.append("|---|---|---|")
    for label in LABELS:
        n = counts.get(label, 0)
        pct = (n / len(rows) * 100) if rows else 0.0
        lines.append(f"| {label} | {n} | {pct:.1f}% |")

    if warnings:
        lines.append("\n## ⚠ Warnings\n")
        for w in warnings:
            lines.append(f"- {w}")
    if synth:
        lines.append(f"\n{synth} synthetic PQC_READY samples were generated "
                     f"(`training_data/synthetic_pqc/`).")

    lines.append("\n## Examples per class\n")
    for label in LABELS:
        lines.append(f"\n### {label}\n")
        picks = examples.get(label, [])[:3]
        if not picks:
            lines.append("_No samples in this class._")
            continue
        for url, evidence, snippet in picks:
            lines.append(f"- **{url}**")
            lines.append(f"  - evidence: `{evidence}`")
            lines.append(f"  - snippet: `{snippet[:200]}`")

    lines.append("\n## Uncertain samples (flagged for manual review)\n")
    if uncertain:
        lines.append(f"{len(uncertain)} samples had signals from more than one class. "
                     "The weakest link wins, so these are labelled conservatively.\n")
        lines.append("| File | Label | Conflict |")
        lines.append("|---|---|---|")
        for filename, label, reason in uncertain[:40]:
            lines.append(f"| {filename} | {label} | {reason} |")
        if len(uncertain) > 40:
            lines.append(f"\n_...and {len(uncertain) - 40} more._")
    else:
        lines.append("None.")

    lines.append("\n## Crypto terms correctly demoted to CLEAN (prose context)\n")
    if prose_saves:
        lines.append(f"{len(prose_saves)} samples contain a crypto term but no protocol "
                     "evidence, so they were labelled CLEAN. These are the samples that "
                     "separate this labeller from a plain regex.\n")
        lines.append("| File | Why CLEAN |")
        lines.append("|---|---|")
        for filename, reason in prose_saves[:40]:
            lines.append(f"| {filename} | {reason} |")
        if len(prose_saves) > 40:
            lines.append(f"\n_...and {len(prose_saves) - 40} more._")
    else:
        lines.append("None.")

    path = data_dir / "labeling_report.md"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Auto-label collected training data.")
    parser.add_argument(
        "--data-dir",
        default=str(Path(__file__).resolve().parent.parent.parent / "training_data"),
    )
    parser.add_argument("--synthetic-pqc", type=int, default=20,
                        help="How many synthetic PQC samples to make if the class is empty")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    manifest_path = data_dir / "manifest.csv"
    if not manifest_path.exists():
        print(f"manifest not found: {manifest_path}", file=sys.stderr)
        return 1

    rows = list(csv.DictReader(manifest_path.open(encoding="utf-8")))
    counts: Counter = Counter()
    uncertain: list[tuple[str, str, str]] = []
    prose_saves: list[tuple[str, str]] = []
    examples: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
    missing = 0

    for row in rows:
        record = load_record(data_dir, row["filename"])
        if record is None:
            missing += 1
            row["label"] = ""
            row["label_evidence"] = "file missing or unreadable"
            continue

        headers = record.get("response_headers") or {}
        body = record.get("response_body") or ""
        if not isinstance(headers, dict):  # defensive; collector always writes a dict
            headers = {}

        label, evidence = label_sample(headers, body)
        row["label"] = label
        row["label_evidence"] = evidence
        counts[label] += 1

        conflict = is_uncertain(headers, body)
        if conflict:
            uncertain.append((row["filename"], label, conflict))
        if label == "CLEAN" and "only in prose/path" in evidence:
            prose_saves.append((row["filename"], evidence))
        if len(examples[label]) < 3:
            examples[label].append((record.get("url", ""), evidence, body[:200].replace("\n", " ")))

    # ── Quality safeguards ──────────────────────────────────────────────────
    warnings: list[str] = []
    for label in LABELS:
        if counts.get(label, 0) == 0:
            warnings.append(f"class **{label}** has 0 samples — targeted collection needed.")

    synth_count = 0
    if counts.get("PQC_READY", 0) == 0 and args.synthetic_pqc > 0:
        synth_rows = generate_synthetic_pqc(data_dir / "synthetic_pqc", args.synthetic_pqc)
        rows.extend(synth_rows)
        counts["PQC_READY"] += len(synth_rows)
        synth_count = len(synth_rows)
        for r in synth_rows[:3]:
            examples["PQC_READY"].append((r["url"], r["label_evidence"], "synthetic sample"))
        warnings.append(
            f"PQC_READY was empty — generated {synth_count} synthetic samples "
            "(real PQC deployment is still rare)."
        )

    clean_pct = counts.get("CLEAN", 0) / len(rows) * 100 if rows else 0
    if clean_pct > 80:
        warnings.append(f"CLEAN is {clean_pct:.1f}% of the corpus — expected, not an error.")
    if missing:
        warnings.append(f"{missing} manifest rows pointed at missing/unreadable files.")

    # ── Write manifest back with the two new columns ────────────────────────
    fieldnames = ["filename", "domain", "url", "status_code", "content_type",
                  "has_crypto_signal", "label", "label_evidence"]
    with manifest_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in fieldnames})

    report = write_report(data_dir, rows, counts, uncertain, prose_saves,
                          examples, warnings, synth_count)

    # ── Console summary ─────────────────────────────────────────────────────
    print("=" * 66)
    print("AUTO-LABELLING RESULTS")
    print("=" * 66)
    print(f"Total samples labelled : {len(rows)}")
    for label in LABELS:
        n = counts.get(label, 0)
        print(f"  {label:<20} {n:>5}  ({n/len(rows)*100:>5.1f}%)")
    print(f"\nUncertain (multi-signal), flagged for review : {len(uncertain)}")
    print(f"Crypto term demoted to CLEAN (prose context)  : {len(prose_saves)}")
    if synth_count:
        print(f"Synthetic PQC_READY generated                : {synth_count}")
    if warnings:
        print("\nWarnings:")
        for w in warnings:
            print(f"  ! {w}")
    print(f"\nManifest : {manifest_path}")
    print(f"Report   : {report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
