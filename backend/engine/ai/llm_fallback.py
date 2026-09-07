import os
import json
import httpx
from typing import List
from .schemas import ClassifierInput, SingleDetection
from core.config import settings
from core.logging import get_logger

log = get_logger(__name__)

FALLBACK_SYSTEM_PROMPT = """You are a cryptographic security analyst specializing in post-quantum readiness.
Analyze the HTTP response provided and identify any cryptographic algorithm references.
Respond ONLY with a valid JSON array. No explanation, no markdown, no preamble.
If nothing is found, return an empty array [].
Each item in the array must follow this exact schema:
{
  "algorithm_detected": "string -- exact algorithm name found",
  "quantum_safe": boolean -- true only for NIST PQC (ML-KEM, ML-DSA, SPHINCS+),
  "risk_class": "QUANTUM_VULNERABLE" | "CLASSICAL_SAFE" | "PQC_READY" | "UNKNOWN",
  "confidence": float between 0.0 and 1.0,
  "location": "string -- where in the response (header name or body path)",
  "evidence_text": "string -- exact text snippet, max 100 chars",
  "reason": "string -- one sentence explanation"
}
Classification rules:
  QUANTUM_VULNERABLE: RSA-*, ECDSA-*, ECDHE, DH-*, RC4, DES, 3DES, MD5,
                      RS256/384/512, ES256/384/512, PS256/384/512,
                      sha*WithRSAEncryption, NTLM, anything using elliptic curves
                      or integer factorization
  CLASSICAL_SAFE: AES-256, AES-128, SHA-256, SHA-512, HS256/384/512, Ed25519,
                  ChaCha20, Poly1305
  PQC_READY: ML-KEM-*, ML-DSA-*, CRYSTALS-Kyber, CRYSTALS-Dilithium,
             SPHINCS+, FALCON, BIKE, HQC, anything in NIST FIPS 203/204/205
  UNKNOWN: Cannot determine classification with confidence"""

def build_fallback_user_prompt(payload: ClassifierInput) -> str:
    header_str = " | ".join(f"{k}: {v}" for k, v in payload.response_headers.items())
    return f"""HTTP Response to analyze:
URL: {payload.request_url}
Status: {payload.status_code}
HEADERS:
{header_str}
BODY (first 2000 chars):
{payload.response_body[:2000]}

Return JSON array only."""

ANTHROPIC_MESSAGES_ENDPOINT = "https://api.anthropic.com/v1/messages"


def log_llm_fallback_config() -> None:
    """
    Log the LLM fallback configuration at service startup so a misconfigured
    model name or a disabled fallback is visible immediately, instead of
    surfacing as silent per-scan failures.
    """
    log.info(
        "llm_fallback_config",
        enabled=settings.llm_fallback_enabled,
        model=settings.llm_model,
        endpoint=ANTHROPIC_MESSAGES_ENDPOINT,
        timeout_seconds=settings.llm_fallback_timeout,
        api_key_configured=bool(settings.anthropic_api_key),
    )


async def llm_classify(payload: ClassifierInput) -> List[SingleDetection]:
    if not settings.llm_fallback_enabled:
        log.info("llm_fallback_disabled", asset_url=payload.asset_url)
        return []

    if not settings.anthropic_api_key:
        log.warning("anthropic_api_key_missing_skipping_llm_fallback")
        return []

    try:
        user_prompt = build_fallback_user_prompt(payload)
        
        async with httpx.AsyncClient(timeout=settings.llm_fallback_timeout) as client:
            resp = await client.post(
                ANTHROPIC_MESSAGES_ENDPOINT,
                headers={
                    "x-api-key": settings.anthropic_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": settings.llm_model,
                    "max_tokens": settings.llm_max_tokens,
                    "system": FALLBACK_SYSTEM_PROMPT,
                    "messages": [
                        {"role": "user", "content": user_prompt}
                    ]
                }
            )
            if resp.status_code < 200 or resp.status_code >= 300:
                # Surface HTTP failures (401, 429, 5xx, ...) distinctly from
                # "no crypto detected" — both still return [] to the pipeline.
                log.error(
                    "llm_fallback_http_error",
                    status_code=resp.status_code,
                    model=settings.llm_model,
                    endpoint=ANTHROPIC_MESSAGES_ENDPOINT,
                    error_body=resp.text[:500],
                    asset_url=payload.asset_url,
                )
                return []

            data = resp.json()
            response_text = data["content"][0]["text"].strip()
            
            # Defensive parsing just in case Claude included markdown
            if response_text.startswith("```json"):
                response_text = response_text[7:-3].strip()
            elif response_text.startswith("```"):
                response_text = response_text[3:-3].strip()

            parsed_list = json.loads(response_text)
            
            detections = []
            for item in parsed_list:
                detections.append(SingleDetection(**item))
                
            return detections

    except httpx.TimeoutException as e:
        log.error(
            "llm_fallback_timeout",
            timeout_seconds=settings.llm_fallback_timeout,
            model=settings.llm_model,
            endpoint=ANTHROPIC_MESSAGES_ENDPOINT,
            error=str(e),
            asset_url=payload.asset_url,
        )
        return []
    except Exception as e:
        log.error("llm_fallback_failed", error=str(e), asset_url=payload.asset_url)
        return []
