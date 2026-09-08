"""
TRINETRA — Training dataset builder.

Turns labelled `training_data/manifest.csv` rows into train/val/test JSONL, using
TRINETRA's own `preprocess_response()` so every training sample is byte-shaped like
production input.

Pipeline:
    load + filter -> preprocess (real tokenizer) -> clean -> augment
    -> hard negatives -> dedupe (3 levels) -> split by seed domain -> JSONL

Usage:
    python scripts/build_training_dataset.py
    python scripts/build_training_dataset.py --data-dir ../training_data --seed 42
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import logging
import random
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.ai.preprocessor import preprocess_response  # noqa: E402
from engine.ai.schemas import ClassifierInput  # noqa: E402

log = logging.getLogger("build_training_dataset")

LABELS = ("QUANTUM_VULNERABLE", "CLASSICAL_SAFE", "PQC_READY", "CLEAN")
MODEL_DIR = Path(__file__).resolve().parent.parent / "engine/ai/loaded_model/crypto_classifier"

MAX_MODEL_TOKENS = 512
AUGMENTS_PER_SAMPLE = 4  # within the requested 3-5 range


# ─────────────────────────────────────────────────────────────────────────────
# 1c. Cleaning — remove volatile identifiers, keep every crypto token
# ─────────────────────────────────────────────────────────────────────────────

UUID_RE = re.compile(
    r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.IGNORECASE
)
ISO_TS_RE = re.compile(
    r"\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?\b"
)
HTTP_DATE_RE = re.compile(
    r"\b(mon|tue|wed|thu|fri|sat|sun),\s+\d{1,2}\s+"
    r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}\s+"
    r"\d{2}:\d{2}:\d{2}\s+gmt\b",
    re.IGNORECASE,
)
LONG_HEX_RE = re.compile(r"\b[0-9a-f]{32,}\b", re.IGNORECASE)
WHITESPACE_RE = re.compile(r"\s+")

# Tokens that must never be stripped or altered by cleaning.
PRESERVE_RE = re.compile(
    r"\b("
    r"rs(?:256|384|512)|es(?:256|384|512|256k)|ps(?:256|384|512)|hs(?:256|384|512)|eddsa"
    r"|rsa(?:-\d{3,4})?|rsassa[-a-z0-9]*|rsaes[-a-z0-9]*|ecdsa|ecdhe?|dhe?|dsa"
    r"|aes(?:-?\d{3})?(?:[-_](?:gcm|cbc|ctr|ccm))?|chacha20(?:-poly1305)?|poly1305"
    r"|sha-?\d{1,3}|sha3-\d{3}|md5|x25519|x448|ed25519|ed448|curve25519"
    r"|ml-kem(?:-\d{3})?|ml-dsa(?:-\d{2})?|kyber\d*|dilithium\d*|sphincs\+?|slh-dsa"
    r"|falcon-?\d{3}|bike|hqc|x25519kyber768(?:d00)?|x25519mlkem768"
    r"|3?des|rc4|ntlm|negotiate|kerberos|pkcs#?1|secp\d{3}r1|p-(?:256|384|521)"
    r"|tls_[a-z0-9_]+|tls1?\.?[0-3]"
    r")\b",
    re.IGNORECASE,
)


def clean_text(text: str) -> str:
    """
    Strip volatile identifiers so the model cannot memorise them, while leaving
    every algorithm / cipher-suite / protocol token untouched.

    Crypto tokens are masked out before substitution and restored afterwards, so a
    generic pattern can never eat one (this is the bug class that destroyed the
    `sha512-` prefixes during collection).
    """
    if not text:
        return ""

    # Protect crypto tokens behind placeholders
    protected: list[str] = []

    def _protect(m: re.Match) -> str:
        protected.append(m.group(0))
        return f"\x00{len(protected) - 1}\x00"

    text = PRESERVE_RE.sub(_protect, text)

    text = UUID_RE.sub(" ", text)
    text = ISO_TS_RE.sub(" ", text)
    text = HTTP_DATE_RE.sub(" ", text)
    text = LONG_HEX_RE.sub(" ", text)
    text = WHITESPACE_RE.sub(" ", text).strip()

    # Restore
    def _restore(m: re.Match) -> str:
        return protected[int(m.group(1))]

    text = re.sub(r"\x00(\d+)\x00", _restore, text)
    return WHITESPACE_RE.sub(" ", text).strip()


# ─────────────────────────────────────────────────────────────────────────────
# 1d. Augmentation — vary surface form, never the label
# ─────────────────────────────────────────────────────────────────────────────

# Algorithm swaps are always within one label class, so the label stays valid.
SAME_CLASS_SWAPS: dict[str, list[list[str]]] = {
    "QUANTUM_VULNERABLE": [
        ["RSA-2048", "RSA-3072", "RSA-4096", "RSA-1024"],
        ["RS256", "RS384", "RS512"],
        ["ES256", "ES384", "ES512"],
        ["PS256", "PS384", "PS512"],
        ["ECDSA", "ECDHE", "DHE"],
        ["MD5", "SHA-1"],
        ["3DES", "DES", "RC4"],
        ["NTLM", "Negotiate", "Kerberos"],
    ],
    "CLASSICAL_SAFE": [
        ["AES-128", "AES-192", "AES-256"],
        ["AES-256-GCM", "AES-128-GCM", "AES-256-CBC"],
        ["SHA-256", "SHA-384", "SHA-512"],
        ["HS256", "HS384", "HS512"],
        ["Ed25519", "Ed448", "EdDSA"],
        ["ChaCha20-Poly1305", "ChaCha20"],
    ],
    "PQC_READY": [
        ["ML-KEM-512", "ML-KEM-768", "ML-KEM-1024"],
        ["ML-DSA-44", "ML-DSA-65", "ML-DSA-87"],
        ["Kyber512", "Kyber768", "Kyber1024"],
        ["Dilithium2", "Dilithium3", "Dilithium5"],
        ["X25519Kyber768", "X25519MLKEM768"],
        ["Falcon-512", "Falcon-1024", "SLH-DSA"],
    ],
    "CLEAN": [],  # no crypto tokens worth swapping
}

NOISE_HEADER_POOL = [
    ("x-request-id", lambda r: f"req-{r.randrange(10**9):09d}"),
    ("x-trace-id", lambda r: f"trace-{r.randrange(10**12):012d}"),
    ("x-correlation-id", lambda r: f"corr-{r.randrange(10**8):08d}"),
    ("cache-control", lambda r: r.choice(["no-cache", "max-age=0", "private", "public, max-age=300"])),
    ("x-served-by", lambda r: r.choice(["cache-lhr-1", "cache-fra-3", "cache-iad-7"])),
    ("vary", lambda r: r.choice(["Accept-Encoding", "Accept, Accept-Encoding", "Origin"])),
    ("x-ratelimit-remaining", lambda r: str(r.randrange(0, 5000))),
    ("age", lambda r: str(r.randrange(0, 3600))),
]


def swap_algorithms(headers: dict[str, str], body: str, label: str, rng: random.Random
                    ) -> tuple[dict[str, str], str]:
    """Replace algorithm names with same-class alternatives."""
    groups = SAME_CLASS_SWAPS.get(label) or []
    if not groups:
        return headers, body

    new_headers, new_body = dict(headers), body
    for group in groups:
        present = [a for a in group if re.search(rf"\b{re.escape(a)}\b", new_body, re.IGNORECASE)]
        if not present:
            continue
        src = present[0]
        alternatives = [a for a in group if a.lower() != src.lower()]
        if not alternatives:
            continue
        dst = rng.choice(alternatives)
        new_body = re.sub(rf"\b{re.escape(src)}\b", dst, new_body, flags=re.IGNORECASE)
        for k, v in list(new_headers.items()):
            new_headers[k] = re.sub(rf"\b{re.escape(src)}\b", dst, v, flags=re.IGNORECASE)
    return new_headers, new_body


def augment(headers: dict[str, str], body: str, label: str, rng: random.Random,
            variant: int) -> tuple[dict[str, str], str]:
    """Produce one augmented variant. The label is never touched."""
    h, b = dict(headers), body

    # Algorithm swap (same class -> label stays correct)
    h, b = swap_algorithms(h, b, label, rng)

    # Random header reorder
    items = list(h.items())
    rng.shuffle(items)
    h = dict(items)

    # Realistic noise headers
    for name, make in rng.sample(NOISE_HEADER_POOL, k=rng.randint(2, 4)):
        h[name] = make(rng)

    # Random body truncation on every variant, at a distinct fraction per variant.
    # Reordering headers alone barely moves the token set, so those variants were
    # being culled as >90% near-duplicates; varying the body length is what makes
    # an augmentation a genuinely different sample.
    if b:
        fractions = [0.35, 0.55, 0.75, 0.9, 1.0]
        frac = fractions[variant % len(fractions)]
        jitter = rng.uniform(-0.07, 0.07)
        cut = max(80, min(len(b), int(len(b) * max(0.15, frac + jitter))))
        b = b[:cut]

    return h, b


# ─────────────────────────────────────────────────────────────────────────────
# 1e. Extra hard negatives — crypto tokens turned into lookalike non-crypto
# ─────────────────────────────────────────────────────────────────────────────

LOOKALIKE_SUBS = [
    ("RS256", "RS256-conference-badge-id"),
    ("ECDSA", "ECDSA Street, Melbourne"),
    ("RSA", "RSA Conference exhibitor hall"),
    ("ML-KEM-768", "ML-KEM-768 catalogue part number"),
    ("Kyber", "Kyber Labs Inc."),
    ("Dilithium", "Dilithium Assurance Group"),
    ("AES-256", "AES-256 model railway kit"),
    ("SHA-256", "SHA-256 Building, Level 4"),
    ("HS256", "HS256 bus route"),
    ("Ed25519", "Ed25519 seat number"),
    ("ES256", "ES256 postal code"),
    ("MD5", "MD5 Motorway junction"),
    ("3DES", "3DES Avenue"),
    ("X25519Kyber768", "X25519Kyber768 SKU"),
]


def make_lookalike_negatives(samples: list["Sample"], count: int, rng: random.Random
                             ) -> list["Sample"]:
    """
    Take real crypto-bearing samples and demote their algorithm tokens into
    non-crypto lookalikes, producing CLEAN examples that still trip a naive regex.
    """
    donors = [s for s in samples if s.label != "CLEAN"]
    if not donors:
        return []

    out: list[Sample] = []
    i = 0
    while len(out) < count and i < count * 10:
        donor = donors[i % len(donors)]
        i += 1
        text = donor.text
        applied = False
        for src, dst in LOOKALIKE_SUBS:
            if re.search(rf"\b{re.escape(src)}\b", text, re.IGNORECASE):
                text = re.sub(rf"\b{re.escape(src)}\b", dst, text, flags=re.IGNORECASE)
                applied = True
        if not applied:
            continue
        out.append(Sample(
            text=clean_text(text.lower())[:MAX_MODEL_TOKENS * 4],
            label="CLEAN",
            seed=f"lookalike:{donor.seed}",
            source="lookalike_hard_negative",
            origin="generated",
            evidence=f"algorithm tokens demoted to non-crypto lookalikes (from {donor.seed})",
        ))
    return out[:count]


# ─────────────────────────────────────────────────────────────────────────────
# Sample container
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Sample:
    text: str
    label: str
    seed: str          # grouping key for the split (source domain)
    source: str        # collection_source
    origin: str        # "real" | "augmented" | "generated"
    evidence: str = ""
    algorithms: list[str] = field(default_factory=list)

    def token_estimate(self) -> int:
        return len(self.text) // 4


# ─────────────────────────────────────────────────────────────────────────────
# 1f. Deduplication
# ─────────────────────────────────────────────────────────────────────────────

def normalize_for_dedupe(text: str) -> str:
    return WHITESPACE_RE.sub(" ", (text or "").lower()).strip()


def dedupe(samples: list[Sample]) -> tuple[list[Sample], dict[str, int]]:
    """Exact -> normalized -> near-duplicate (>90% token overlap, same label)."""
    stats = {"exact": 0, "normalized": 0, "near": 0}

    seen_exact: set[str] = set()
    stage1: list[Sample] = []
    for s in samples:
        h = hashlib.sha256(s.text.encode("utf-8")).hexdigest()
        if h in seen_exact:
            stats["exact"] += 1
            continue
        seen_exact.add(h)
        stage1.append(s)

    seen_norm: set[str] = set()
    stage2: list[Sample] = []
    for s in stage1:
        h = hashlib.sha256(normalize_for_dedupe(s.text).encode("utf-8")).hexdigest()
        if h in seen_norm:
            stats["normalized"] += 1
            continue
        seen_norm.add(h)
        stage2.append(s)

    # Near-duplicates, compared only within the same label
    kept: list[Sample] = []
    by_label: dict[str, list[set[str]]] = defaultdict(list)
    for s in stage2:
        tokens = set(s.text.split())
        if not tokens:
            continue
        duplicate = False
        for other in by_label[s.label]:
            union = len(tokens | other)
            if union and len(tokens & other) / union > 0.90:
                duplicate = True
                break
        if duplicate:
            stats["near"] += 1
            continue
        by_label[s.label].append(tokens)
        kept.append(s)

    return kept, stats


# ─────────────────────────────────────────────────────────────────────────────
# 1g. Split by seed domain, stratified by label
# ─────────────────────────────────────────────────────────────────────────────

def split_by_seed(samples: list[Sample], rng: random.Random
                  ) -> dict[str, list[Sample]]:
    """
    80/10/10 grouped by seed so every augmentation of a seed lands in one split.

    Domains are bucketed by their dominant label and dealt out per label, which keeps
    class proportions as close to the target as grouping allows.
    """
    by_seed: dict[str, list[Sample]] = defaultdict(list)
    for s in samples:
        by_seed[s.seed].append(s)

    # Rarest label first. A minority-class sample usually rides inside a domain whose
    # bulk is CLEAN, so dealing by *dominant* label strands the rare classes entirely
    # in train. Dealing rarest-first over seeds that CONTAIN the label, and locking a
    # seed once assigned, keeps the grouping guarantee while giving val/test coverage.
    label_totals = Counter(s.label for s in samples)
    label_order = sorted(
        (l for l in LABELS if label_totals.get(l)),
        key=lambda l: label_totals[l],
    )

    splits: dict[str, list[Sample]] = {"train": [], "val": [], "test": []}
    assigned: dict[str, str] = {}

    for label in label_order:
        seeds = sorted({s.seed for s in samples if s.label == label} - set(assigned))
        rng.shuffle(seeds)
        n = len(seeds)
        if n == 0:
            continue
        if n == 1:
            targets = ["train"]
        elif n == 2:
            targets = ["train", "test"]
        elif n == 3:
            targets = ["train", "val", "test"]
        else:
            n_val = max(1, round(n * 0.10))
            n_test = max(1, round(n * 0.10))
            targets = (["train"] * (n - n_val - n_test)
                       + ["val"] * n_val + ["test"] * n_test)
        for seed, target in zip(seeds, targets):
            assigned[seed] = target

    # Any seed not touched above (pure-CLEAN domains) is dealt 80/10/10
    remaining = sorted(set(by_seed) - set(assigned))
    rng.shuffle(remaining)
    n = len(remaining)
    n_val, n_test = round(n * 0.10), round(n * 0.10)
    for i, seed in enumerate(remaining):
        if i < n_val:
            assigned[seed] = "val"
        elif i < n_val + n_test:
            assigned[seed] = "test"
        else:
            assigned[seed] = "train"

    for seed, target in assigned.items():
        splits[target].extend(by_seed[seed])

    return splits


# ─────────────────────────────────────────────────────────────────────────────
# Majority-class downsampling
# ─────────────────────────────────────────────────────────────────────────────

def downsample_clean(splits: dict[str, list[Sample]], min_share: float,
                     rng: random.Random) -> dict[str, int]:
    """
    Trim CLEAN within each split until every other class clears `min_share`.

    Real HTTP traffic is ~90% CLEAN, which is honest but leaves the three crypto
    classes under any sane per-class floor -- and a 90% majority class trains a model
    that answers CLEAN to everything. Capping CLEAN is the standard remedy.

    Trimming happens *after* the split, so no sample ever moves between splits and
    the seed-grouping guarantee is preserved. Real samples are kept in preference to
    augmented ones, and seeds are visited round-robin so the survivors stay diverse.
    """
    removed: dict[str, int] = {}
    minority = [l for l in LABELS if l != "CLEAN"]

    for name, rows in splits.items():
        clean = [s for s in rows if s.label == "CLEAN"]
        others = [s for s in rows if s.label != "CLEAN"]
        if not clean or not others:
            removed[name] = 0
            continue

        present = [l for l in minority if any(s.label == l for s in others)]
        if not present:
            removed[name] = 0
            continue

        smallest = min(sum(1 for s in others if s.label == l) for l in present)
        # smallest / total >= min_share  =>  total <= smallest / min_share
        max_total = int(smallest / min_share)
        max_clean = max(0, max_total - len(others))
        if len(clean) <= max_clean:
            removed[name] = 0
            continue

        # Round-robin over seeds, real samples first, so the kept CLEAN stays varied
        by_seed: dict[str, list[Sample]] = defaultdict(list)
        for s in clean:
            by_seed[s.seed].append(s)
        for group in by_seed.values():
            group.sort(key=lambda s: 0 if s.origin == "real" else 1)

        seeds = sorted(by_seed)
        rng.shuffle(seeds)
        kept: list[Sample] = []
        idx = 0
        while len(kept) < max_clean:
            progressed = False
            for seed in seeds:
                group = by_seed[seed]
                if idx < len(group):
                    kept.append(group[idx])
                    progressed = True
                    if len(kept) >= max_clean:
                        break
            if not progressed:
                break
            idx += 1

        removed[name] = len(clean) - len(kept)
        splits[name] = others + kept
        rng.shuffle(splits[name])

    return removed


# ─────────────────────────────────────────────────────────────────────────────
# Loading + preprocessing
# ─────────────────────────────────────────────────────────────────────────────

def load_tokenizer():
    """Real tokenizer from the shipped model dir, so token counts match production."""
    try:
        from transformers import DistilBertTokenizerFast
        tok = DistilBertTokenizerFast.from_pretrained(str(MODEL_DIR))
        print(f"tokenizer loaded from {MODEL_DIR}")
        return tok
    except Exception as exc:
        print(f"WARNING: tokenizer unavailable ({exc}); falling back to len//4 estimate")
        return None


def truncate_to_model_limit(text: str, tokenizer) -> str:
    """
    Cut text to the model's 512-token input limit.

    The preprocessor deliberately does not truncate (it counts tokens with
    truncation=False), and DistilBERT would silently clip at inference. Doing it
    here means the JSONL holds exactly what the model will see, and lets the
    validator assert the limit rather than hope for it.
    """
    if not text:
        return ""
    if tokenizer is None:
        return text[:MAX_MODEL_TOKENS * 4]
    ids = tokenizer(text, truncation=True, max_length=MAX_MODEL_TOKENS,
                    add_special_tokens=True)["input_ids"]
    return tokenizer.decode(ids, skip_special_tokens=True)


def extract_algorithms(text: str) -> list[str]:
    return sorted({m.group(0).lower() for m in PRESERVE_RE.finditer(text or "")})


def build_samples(data_dir: Path, tokenizer, rng: random.Random
                  ) -> tuple[list[Sample], dict[str, int], list[str]]:
    manifest = data_dir / "manifest.csv"
    rows = list(csv.DictReader(manifest.open(encoding="utf-8")))

    counters = {"rows": len(rows), "unlabelled": 0, "missing": 0, "preprocess_failed": 0,
                "real": 0, "augmented": 0}
    problems: list[str] = []
    samples: list[Sample] = []

    for row in rows:
        label = (row.get("label") or "").strip()
        if not label:
            counters["unlabelled"] += 1
            continue
        if label not in LABELS:
            problems.append(f"{row['filename']}: unknown label {label!r}")
            continue

        filename = row["filename"]
        path = data_dir / filename if "/" in filename else data_dir / "raw_responses" / filename
        if not path.exists():
            counters["missing"] += 1
            continue
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            problems.append(f"{filename}: unreadable ({exc})")
            counters["missing"] += 1
            continue

        headers = record.get("response_headers") or {}
        if not isinstance(headers, dict):
            problems.append(f"{filename}: response_headers is {type(headers).__name__}, not dict")
            continue
        headers = {str(k): str(v) for k, v in headers.items()}
        body = record.get("response_body") or ""
        seed = record.get("domain") or row.get("domain") or "unknown"
        source = record.get("collection_source", "unknown")

        # ── 1b + 1c: real preprocessor, then cleaning ───────────────────────
        variants = [(headers, body, "real")]
        for v in range(AUGMENTS_PER_SAMPLE):
            variants.append((*augment(headers, body, label, rng, v), "augmented"))

        for v_headers, v_body, origin in variants:
            try:
                payload = ClassifierInput(
                    asset_url=record.get("url", ""),
                    asset_type="api_endpoint",
                    status_code=int(record.get("status_code") or 200),
                    response_headers=v_headers,
                    response_body=v_body,
                    request_method=record.get("method", "GET"),
                    request_url=record.get("url", ""),
                )
                combined, _ = preprocess_response(payload, tokenizer)
            except Exception as exc:
                counters["preprocess_failed"] += 1
                problems.append(f"{filename} ({origin}): preprocess failed ({exc})")
                continue

            text = truncate_to_model_limit(clean_text(combined), tokenizer)
            if not text.strip():
                counters["preprocess_failed"] += 1
                continue

            samples.append(Sample(
                text=text,
                label=label,
                seed=seed,
                source=source,
                origin=origin,
                evidence=row.get("label_evidence", ""),
                algorithms=extract_algorithms(text),
            ))
            counters["real" if origin == "real" else "augmented"] += 1

    return samples, counters, problems


# ─────────────────────────────────────────────────────────────────────────────
# Output + report
# ─────────────────────────────────────────────────────────────────────────────

def write_jsonl(path: Path, samples: list[Sample]) -> None:
    with path.open("w", encoding="utf-8") as fh:
        for s in samples:
            fh.write(json.dumps({"text": s.text, "label": s.label}, ensure_ascii=False) + "\n")


def write_report(data_dir: Path, splits: dict[str, list[Sample]], counters: dict[str, int],
                 dedupe_stats: dict[str, int], problems: list[str],
                 pre_dedupe: int, examples: list[tuple[str, str, str, str]],
                 tokenizer_ok: bool) -> Path:
    total = sum(len(v) for v in splits.values())
    lines = ["# TRINETRA — Training Dataset Report\n",
             f"Generated: {datetime.now(timezone.utc).isoformat()}\n",
             f"Tokenizer: {'real DistilBERT tokenizer' if tokenizer_ok else 'FALLBACK len//4 estimate'}\n"]

    lines.append("\n## Counts\n")
    lines.append("| Stage | Count |")
    lines.append("|---|---|")
    lines.append(f"| Manifest rows | {counters['rows']} |")
    lines.append(f"| Skipped: unlabelled | {counters['unlabelled']} |")
    lines.append(f"| Skipped: missing/unreadable file | {counters['missing']} |")
    lines.append(f"| Skipped: preprocess failed | {counters['preprocess_failed']} |")
    lines.append(f"| Real samples preprocessed | {counters['real']} |")
    lines.append(f"| Augmented variants | {counters['augmented']} |")
    lines.append(f"| Lookalike hard negatives | {counters.get('lookalike', 0)} |")
    lines.append(f"| **Before dedupe** | **{pre_dedupe}** |")
    lines.append(f"| Removed: exact duplicates | {dedupe_stats['exact']} |")
    lines.append(f"| Removed: normalized duplicates | {dedupe_stats['normalized']} |")
    lines.append(f"| Removed: near-duplicates (>90% overlap) | {dedupe_stats['near']} |")
    if counters.get("clean_downsampled"):
        lines.append(f"| Removed: CLEAN downsampled | {counters['clean_downsampled']} |")
    lines.append(f"| **Final dataset** | **{total}** |")

    lines.append("\n## Class distribution per split\n")
    lines.append("| Split | " + " | ".join(LABELS) + " | Total |")
    lines.append("|---" * (len(LABELS) + 2) + "|")
    for name in ("train", "val", "test"):
        counts = Counter(s.label for s in splits[name])
        n = len(splits[name])
        cells = []
        for label in LABELS:
            c = counts.get(label, 0)
            cells.append(f"{c} ({c/n*100:.1f}%)" if n else "0")
        lines.append(f"| {name} | " + " | ".join(cells) + f" | {n} |")

    lines.append("\n## Text length (characters)\n")
    lines.append("| Split | min | avg | max | est. tokens (max) |")
    lines.append("|---|---|---|---|---|")
    for name in ("train", "val", "test"):
        lens = [len(s.text) for s in splits[name]]
        if not lens:
            lines.append(f"| {name} | - | - | - | - |")
            continue
        lines.append(f"| {name} | {min(lens)} | {sum(lens)//len(lens)} | {max(lens)} "
                     f"| {max(lens)//4} |")

    lines.append("\n## Algorithm distribution\n")
    algo_counts: Counter = Counter()
    for split in splits.values():
        for s in split:
            algo_counts.update(s.algorithms)
    lines.append("| Algorithm/token | Samples |")
    lines.append("|---|---|")
    for algo, n in algo_counts.most_common(30):
        lines.append(f"| {algo} | {n} |")
    if not algo_counts:
        lines.append("| _none detected_ | 0 |")

    lines.append("\n## Source distribution\n")
    src_counts = Counter(s.source for split in splits.values() for s in split)
    lines.append("| collection_source | Samples |")
    lines.append("|---|---|")
    for src, n in src_counts.most_common():
        lines.append(f"| {src} | {n} |")

    lines.append("\n## Seed-domain distribution (top 20)\n")
    seed_counts = Counter(s.seed for split in splits.values() for s in split)
    lines.append("| Seed domain | Samples |")
    lines.append("|---|---|")
    for seed, n in seed_counts.most_common(20):
        lines.append(f"| {seed} | {n} |")

    lines.append("\n## Example rows (raw -> cleaned -> label -> evidence)\n")
    for i, (raw, cleaned, label, evidence) in enumerate(examples[:3], 1):
        lines.append(f"\n### Example {i}\n")
        lines.append(f"- **label**: `{label}`")
        lines.append(f"- **evidence**: `{evidence or 'n/a'}`")
        lines.append(f"- **raw (first 300 chars)**:\n```\n{raw[:300]}\n```")
        lines.append(f"- **cleaned (first 300 chars)**:\n```\n{cleaned[:300]}\n```")

    if problems:
        lines.append(f"\n## Issues ({len(problems)})\n")
        for p in problems[:30]:
            lines.append(f"- {p}")
        if len(problems) > 30:
            lines.append(f"- _...and {len(problems)-30} more_")

    path = data_dir / "dataset_report.md"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Build train/val/test JSONL from the manifest.")
    parser.add_argument("--data-dir",
                        default=str(Path(__file__).resolve().parent.parent.parent / "training_data"))
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--lookalikes", type=int, default=20)
    parser.add_argument(
        "--min-class-share", type=float, default=0.05,
        help="Downsample CLEAN until every other class reaches this share of each "
             "split (default 0.05, matching validate_dataset.py). Pass 0 to keep the "
             "natural ~90%% CLEAN distribution.",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(message)s")
    rng = random.Random(args.seed)
    data_dir = Path(args.data_dir)

    tokenizer = load_tokenizer()
    samples, counters, problems = build_samples(data_dir, tokenizer, rng)

    # Keep raw/cleaned examples for the report before augmentation blurs things
    examples: list[tuple[str, str, str, str]] = []
    for s in samples:
        if s.origin == "real" and len(examples) < 3:
            examples.append((s.text[:600], s.text[:600], s.label, s.evidence))

    # 1e. lookalike hard negatives (hard_negatives/ dir is already in the manifest)
    lookalikes = make_lookalike_negatives(samples, args.lookalikes, rng)
    counters["lookalike"] = len(lookalikes)
    samples.extend(lookalikes)

    pre_dedupe = len(samples)
    samples, dedupe_stats = dedupe(samples)
    splits = split_by_seed(samples, rng)

    clean_removed: dict[str, int] = {}
    if args.min_class_share > 0:
        clean_removed = downsample_clean(splits, args.min_class_share, rng)
        counters["clean_downsampled"] = sum(clean_removed.values())

    for name in ("train", "val", "test"):
        write_jsonl(data_dir / f"{name}.jsonl", splits[name])

    report = write_report(data_dir, splits, counters, dedupe_stats, problems,
                          pre_dedupe, examples, tokenizer is not None)

    print("\n" + "=" * 66)
    print("DATASET BUILD SUMMARY")
    print("=" * 66)
    print(f"manifest rows            : {counters['rows']}")
    print(f"  unlabelled (skipped)   : {counters['unlabelled']}")
    print(f"  missing file (skipped) : {counters['missing']}")
    print(f"  preprocess failed      : {counters['preprocess_failed']}")
    print(f"real samples             : {counters['real']}")
    print(f"augmented variants       : {counters['augmented']}")
    print(f"lookalike hard negatives : {counters['lookalike']}")
    print(f"before dedupe            : {pre_dedupe}")
    print(f"  exact dupes removed    : {dedupe_stats['exact']}")
    print(f"  normalized dupes       : {dedupe_stats['normalized']}")
    print(f"  near dupes (>90%)      : {dedupe_stats['near']}")
    if clean_removed:
        print(f"  CLEAN downsampled      : {sum(clean_removed.values())} {clean_removed}")
    print(f"final samples            : {sum(len(v) for v in splits.values())}")
    print()
    for name in ("train", "val", "test"):
        counts = Counter(s.label for s in splits[name])
        n = len(splits[name])
        print(f"{name:<6} n={n:<5} " + "  ".join(f"{l[:2]}={counts.get(l,0)}" for l in LABELS))
    print(f"\nReport: {report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
