"""
TRINETRA — On-Premises Rule-Based Classifier Fallback

Replaces the LLM (Claude) fallback with a deterministic rule-based engine
that works fully offline. Called when DistilBERT confidence < 0.60 or
when the model is not loaded.

Detection strategy:
  1. Header-based detection  — Server, X-Powered-By, WWW-Authenticate, etc.
  2. Body keyword matching   — algorithm names in JSON/XML/HTML responses
  3. JWT header decode       — base64 decode Authorization header to read alg field
  4. TLS cipher suite names  — if present in response body
  5. Version string parsing  — OpenSSL/BoringSSL version strings
"""

import base64
import json
import re
from typing import List

from .schemas import ClassifierInput, SingleDetection
from core.logging import get_logger

log = get_logger(__name__)

# ── Extended algorithm patterns ────────────────────────────────────────────────

_ALGO_RULES: list[tuple[re.Pattern, str, str]] = [
    # (pattern, algorithm_label, risk_class)

    # PQC algorithms
    (re.compile(r"ML-KEM|KYBER|CRYSTALS.KYBER", re.I),       "ML-KEM-768",    "PQC_READY"),
    (re.compile(r"ML-DSA|DILITHIUM|CRYSTALS.DILITHIUM", re.I),"ML-DSA-65",     "PQC_READY"),
    (re.compile(r"SPHINCS\+|SLH-DSA", re.I),                  "SPHINCS+",      "PQC_READY"),
    (re.compile(r"FALCON", re.I),                              "FALCON-512",    "PQC_READY"),

    # Quantum-vulnerable asymmetric
    (re.compile(r"RSA-?(?:512|768|1024)\b", re.I),            "RSA-1024",      "QUANTUM_VULNERABLE"),
    (re.compile(r"RSA-?2048\b", re.I),                        "RSA-2048",      "QUANTUM_VULNERABLE"),
    (re.compile(r"RSA-?(?:3072|4096)\b", re.I),               "RSA-4096",      "QUANTUM_VULNERABLE"),
    (re.compile(r"\bRSA\b(?!-\d)", re.I),                     "RSA-2048",      "QUANTUM_VULNERABLE"),
    (re.compile(r"ECDSA|EC-DSA", re.I),                       "ECDSA-256",     "QUANTUM_VULNERABLE"),
    (re.compile(r"ECDHE|ECDH\b", re.I),                       "ECDHE",         "QUANTUM_VULNERABLE"),
    (re.compile(r"\bDHE\b|\bDH\b", re.I),                     "DHE",           "QUANTUM_VULNERABLE"),
    (re.compile(r"ED25519", re.I),                             "ED25519",       "QUANTUM_VULNERABLE"),

    # JWT signing algorithms
    (re.compile(r'"alg"\s*:\s*"(RS(?:256|384|512))"', re.I),  "RS256",         "QUANTUM_VULNERABLE"),
    (re.compile(r'"alg"\s*:\s*"(ES(?:256|384|512))"', re.I),  "ES256",         "QUANTUM_VULNERABLE"),
    (re.compile(r'"alg"\s*:\s*"(PS(?:256|384|512))"', re.I),  "PS256",         "QUANTUM_VULNERABLE"),
    (re.compile(r'"alg"\s*:\s*"(HS(?:256|384|512))"', re.I),  "HS256",         "CLASSICAL_SAFE"),

    # Weak/broken
    (re.compile(r"\bMD5\b", re.I),                            "MD5",           "QUANTUM_VULNERABLE"),
    (re.compile(r"\bSHA-?1\b", re.I),                         "SHA1",          "QUANTUM_VULNERABLE"),
    (re.compile(r"\b3DES\b|TRIPLE.DES", re.I),                "3DES",          "QUANTUM_VULNERABLE"),
    (re.compile(r"\bRC4\b", re.I),                            "RC4",           "QUANTUM_VULNERABLE"),
    (re.compile(r"\bNTLM\b", re.I),                           "NTLM",          "QUANTUM_VULNERABLE"),

    # Classically safe symmetric
    (re.compile(r"AES-256-GCM|AES_256_GCM", re.I),           "AES-256-GCM",   "CLASSICAL_SAFE"),
    (re.compile(r"AES-256", re.I),                            "AES-256",       "CLASSICAL_SAFE"),
    (re.compile(r"CHACHA20|ChaCha20", re.I),                  "CHACHA20",      "CLASSICAL_SAFE"),

    # OpenSSL version strings — extract algorithm context
    (re.compile(r"OpenSSL/[\d.]+", re.I),                     "RSA-2048",      "QUANTUM_VULNERABLE"),
]

# Headers that reveal crypto context
_HEADER_RULES: list[tuple[str, re.Pattern, str, str]] = [
    # (header_name_lower, value_pattern, algorithm, risk_class)
    ("www-authenticate",  re.compile(r"NTLM", re.I),          "NTLM",          "QUANTUM_VULNERABLE"),
    ("www-authenticate",  re.compile(r"Negotiate", re.I),     "KERBEROS",      "QUANTUM_VULNERABLE"),
    ("server",            re.compile(r"OpenSSL", re.I),       "RSA-2048",      "QUANTUM_VULNERABLE"),
    ("x-powered-by",      re.compile(r"PHP/[45]\.", re.I),    "RSA-2048",      "QUANTUM_VULNERABLE"),
    ("strict-transport-security", re.compile(r"max-age", re.I), "AES-256-GCM", "CLASSICAL_SAFE"),
]


def _try_decode_jwt(auth_header: str) -> list[SingleDetection]:
    """Decode JWT header to extract alg field without verification."""
    detections = []
    try:
        # Bearer <token>
        parts = auth_header.split()
        if len(parts) < 2:
            return []
        token = parts[-1]
        header_b64 = token.split(".")[0]
        # Add padding
        header_b64 += "=" * (4 - len(header_b64) % 4)
        header_json = base64.urlsafe_b64decode(header_b64).decode("utf-8", errors="ignore")
        header_data = json.loads(header_json)
        alg = header_data.get("alg", "")
        if alg:
            risk = "QUANTUM_VULNERABLE"
            if alg.startswith("HS"):
                risk = "CLASSICAL_SAFE"
            elif alg in ("ML-DSA", "ML-KEM"):
                risk = "PQC_READY"
            detections.append(SingleDetection(
                algorithm_detected=alg,
                quantum_safe=(risk == "PQC_READY"),
                risk_class=risk,  # type: ignore
                confidence=0.95,
                location="Authorization header (JWT alg field)",
                evidence_text=f"JWT alg: {alg}",
                reason=f"JWT header decoded — algorithm field is {alg}",
            ))
    except Exception:
        pass
    return detections


async def llm_classify(payload: ClassifierInput) -> List[SingleDetection]:
    """
    On-premises rule-based fallback classifier.
    No external API calls — works fully offline.

    Called when DistilBERT confidence < 0.60 or model not loaded.
    """
    detections: list[SingleDetection] = []
    seen_algos: set[str] = set()

    def add(algo: str, risk: str, confidence: float, location: str, evidence: str, reason: str):
        if algo in seen_algos:
            return
        seen_algos.add(algo)
        detections.append(SingleDetection(
            algorithm_detected=algo,
            quantum_safe=(risk == "PQC_READY"),
            risk_class=risk,  # type: ignore
            confidence=round(confidence, 3),
            location=location,
            evidence_text=evidence[:100],
            reason=reason,
        ))

    # ── 1. JWT decode from Authorization header ────────────────────────────
    headers_raw = payload.response_headers or ""
    if isinstance(headers_raw, dict):
        auth = headers_raw.get("authorization", "") or headers_raw.get("Authorization", "")
    else:
        auth = ""
        for line in str(headers_raw).splitlines():
            if line.lower().startswith("authorization:"):
                auth = line.split(":", 1)[1].strip()
                break
    if auth:
        jwt_detections = _try_decode_jwt(auth)
        for d in jwt_detections:
            if d.algorithm_detected not in seen_algos:
                seen_algos.add(d.algorithm_detected)
                detections.append(d)

    # ── 2. Header-based rules ──────────────────────────────────────────────
    headers_str = str(payload.response_headers or "").lower()
    for header_name, pattern, algo, risk in _HEADER_RULES:
        if header_name in headers_str:
            # Find the header value
            for line in str(payload.response_headers).splitlines():
                if line.lower().startswith(header_name + ":"):
                    val = line.split(":", 1)[1].strip()
                    if pattern.search(val):
                        add(algo, risk, 0.85, f"HTTP header: {header_name}", val[:80],
                            f"{algo} detected in {header_name} header")
                    break

    # ── 3. Body + header combined text scan ───────────────────────────────
    combined = f"{payload.response_headers or ''}\n{payload.response_body or ''}"
    for pattern, algo, risk in _ALGO_RULES:
        m = pattern.search(combined)
        if m:
            snippet = combined[max(0, m.start() - 20): m.end() + 20].strip()
            add(algo, risk, 0.80, "response body/headers", snippet,
                f"{algo} pattern matched in HTTP response")

    log.info(
        "rule_based_fallback_complete",
        url=payload.asset_url,
        detections=len(detections),
        algorithms=[d.algorithm_detected for d in detections],
    )
    return detections
