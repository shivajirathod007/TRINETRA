"""
TRINETRA — Dataset validator. Fails loudly so a broken dataset never reaches Colab.

Exit codes:
    0 — all checks passed
    1 — at least one check FAILED

Usage:
    python scripts/validate_dataset.py
    python scripts/validate_dataset.py --data-dir ../training_data
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

LABELS = {"QUANTUM_VULNERABLE", "CLASSICAL_SAFE", "PQC_READY", "CLEAN"}
SPLITS = ("train", "val", "test")
MAX_TOKENS = 512
MIN_CLASS_SHARE = 0.05

MODEL_DIR = Path(__file__).resolve().parent.parent / "engine/ai/loaded_model/crypto_classifier"

JWT_RE = re.compile(r"eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")
BEARER_RE = re.compile(r"bearer\s+[A-Za-z0-9._-]{20,}", re.IGNORECASE)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


class Validator:
    def __init__(self) -> None:
        self.failures: list[str] = []
        self.warnings: list[str] = []
        self.passes: list[str] = []

    def check(self, condition: bool, name: str, detail: str = "") -> bool:
        if condition:
            self.passes.append(name)
            return True
        self.failures.append(f"{name}{': ' + detail if detail else ''}")
        return False

    def warn(self, message: str) -> None:
        self.warnings.append(message)


def load_tokenizer():
    try:
        from transformers import DistilBertTokenizerFast
        return DistilBertTokenizerFast.from_pretrained(str(MODEL_DIR))
    except Exception:
        return None


def token_len(text: str, tokenizer) -> int:
    if tokenizer is None:
        return len(text) // 4
    return len(tokenizer(text, truncation=False, add_special_tokens=True)["input_ids"])


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower()).strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate the built dataset.")
    parser.add_argument("--data-dir",
                        default=str(Path(__file__).resolve().parent.parent.parent / "training_data"))
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    v = Validator()
    tokenizer = load_tokenizer()

    # ── Load splits ─────────────────────────────────────────────────────────
    data: dict[str, list[dict[str, Any]]] = {}
    for split in SPLITS:
        path = data_dir / f"{split}.jsonl"
        if not path.exists():
            v.check(False, f"{split}.jsonl exists", f"missing at {path}")
            data[split] = []
            continue
        rows = []
        for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except Exception as exc:
                v.check(False, f"{split}.jsonl line {i} is valid JSON", str(exc))
        data[split] = rows
        v.check(True, f"{split}.jsonl exists")

    # ── 1. Labels are in the allowed set ────────────────────────────────────
    bad_labels: Counter = Counter()
    for split, rows in data.items():
        for r in rows:
            if r.get("label") not in LABELS:
                bad_labels[f"{split}:{r.get('label')!r}"] += 1
    v.check(not bad_labels, "all labels are one of the 4 valid classes",
            f"invalid: {dict(bad_labels)}" if bad_labels else "")

    # ── 2. No split is empty ────────────────────────────────────────────────
    for split in SPLITS:
        v.check(len(data[split]) > 0, f"{split} split is non-empty",
                f"{split} has 0 samples")

    # ── 3. All 4 classes present in train ───────────────────────────────────
    train_labels = {r.get("label") for r in data["train"]}
    missing_train = LABELS - train_labels
    v.check(not missing_train, "train contains all 4 classes",
            f"missing from train: {sorted(missing_train)}" if missing_train else "")

    # ── 4. Every class has >=5% share in every split ────────────────────────
    for split in SPLITS:
        rows = data[split]
        if not rows:
            continue
        counts = Counter(r.get("label") for r in rows)
        for label in sorted(LABELS):
            share = counts.get(label, 0) / len(rows)
            v.check(
                share >= MIN_CLASS_SHARE,
                f"{split}: {label} >= {MIN_CLASS_SHARE:.0%}",
                f"{counts.get(label, 0)}/{len(rows)} = {share:.1%}",
            )

    # ── 5. No test sample also appears in train (exact or near-duplicate) ───
    train_exact = {normalize(r.get("text", "")) for r in data["train"]}
    exact_leaks = [r for r in data["test"] if normalize(r.get("text", "")) in train_exact]
    v.check(not exact_leaks, "no exact test/train leakage",
            f"{len(exact_leaks)} test samples appear verbatim in train")

    train_tokens = [set(r.get("text", "").split()) for r in data["train"]]
    near_leaks = 0
    for r in data["test"]:
        tokens = set(r.get("text", "").split())
        if not tokens:
            continue
        for other in train_tokens:
            union = len(tokens | other)
            if union and len(tokens & other) / union > 0.90:
                near_leaks += 1
                break
    v.check(near_leaks == 0, "no near-duplicate test/train leakage (>90% overlap)",
            f"{near_leaks} test samples are near-duplicates of train samples")

    # ── 6. No empty / whitespace-only text ──────────────────────────────────
    empty = sum(1 for rows in data.values() for r in rows if not (r.get("text") or "").strip())
    v.check(empty == 0, "no empty or whitespace-only text fields",
            f"{empty} samples have empty text")

    # ── 7. No secrets ───────────────────────────────────────────────────────
    secret_hits: Counter = Counter()
    for split, rows in data.items():
        for r in rows:
            text = r.get("text", "")
            if JWT_RE.search(text):
                secret_hits["jwt"] += 1
            if BEARER_RE.search(text):
                secret_hits["bearer"] += 1
            if EMAIL_RE.search(text):
                secret_hits["email"] += 1
    v.check(not secret_hits, "no secrets (JWT / Bearer / email) in any text",
            f"found: {dict(secret_hits)}" if secret_hits else "")

    # ── 8. No text exceeds the model's 512-token limit ──────────────────────
    over = []
    max_seen = 0
    for split, rows in data.items():
        for r in rows:
            n = token_len(r.get("text", ""), tokenizer)
            max_seen = max(max_seen, n)
            if n > MAX_TOKENS:
                over.append((split, n))
    v.check(not over, f"no text exceeds {MAX_TOKENS} tokens",
            f"{len(over)} samples over limit (max seen {max_seen})")

    # ── Informational ───────────────────────────────────────────────────────
    total = sum(len(r) for r in data.values())
    if total:
        for split in SPLITS:
            if data[split]:
                share = len(data[split]) / total
                if split == "train" and not (0.6 <= share <= 0.9):
                    v.warn(f"train is {share:.0%} of the data (expected ~80%)")

    # ── Report ──────────────────────────────────────────────────────────────
    print("=" * 70)
    print("DATASET VALIDATION")
    print("=" * 70)
    print(f"tokenizer: {'real DistilBERT' if tokenizer else 'FALLBACK len//4'}")
    print(f"samples  : train={len(data['train'])} val={len(data['val'])} test={len(data['test'])}"
          f"  (total {total})")
    print(f"max tokens observed: {max_seen}\n")

    for split in SPLITS:
        if not data[split]:
            continue
        counts = Counter(r.get("label") for r in data[split])
        n = len(data[split])
        print(f"  {split:<6} " + "  ".join(
            f"{lbl}={counts.get(lbl, 0)} ({counts.get(lbl, 0)/n*100:.1f}%)"
            for lbl in sorted(LABELS)))
    print()

    print(f"PASSED ({len(v.passes)}):")
    for name in v.passes:
        print(f"  [ok]   {name}")

    if v.warnings:
        print(f"\nWARNINGS ({len(v.warnings)}):")
        for w in v.warnings:
            print(f"  [warn] {w}")

    if v.failures:
        print(f"\nFAILED ({len(v.failures)}):")
        for f in v.failures:
            print(f"  [FAIL] {f}")
        print("\n" + "=" * 70)
        print(f"VALIDATION FAILED — {len(v.failures)} check(s) did not pass.")
        print("The dataset is NOT ready for training.")
        print("=" * 70)
        return 1

    print("\n" + "=" * 70)
    print("VALIDATION PASSED — dataset is ready for training.")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
