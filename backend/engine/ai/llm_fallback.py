"""
TRINETRA — LLM Fallback Classifier

Provides LLM-based classification when regex patterns and the DistilBERT
model return no/low-confidence results.

TODO: Integrate Groq API as the primary LLM fallback provider.
      - Add GROQ_API_KEY to .env and core/config.py settings
      - Use Groq's chat completions endpoint (https://api.groq.com/openai/v1/chat/completions)
      - Groq supports fast inference with models like llama3, mixtral, gemma
      - Keep the same FALLBACK_SYSTEM_PROMPT and response parsing logic
      - Update llm_classify() to call Groq instead of Anthropic
"""

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
    """
    LLM-based fallback classifier.
    
    Currently disabled — waiting for Groq API integration.
    Returns empty list so the pipeline continues with regex-only results.
    
    TODO: Replace with Groq API call when GROQ_API_KEY is configured.
          Example Groq integration:
          
          async with httpx.AsyncClient() as client:
              resp = await client.post(
                  "https://api.groq.com/openai/v1/chat/completions",
                  headers={
                      "Authorization": f"Bearer {settings.groq_api_key}",
                      "Content-Type": "application/json",
                  },
                  json={
                      "model": "llama3-70b-8192",  # or mixtral-8x7b-32768
                      "messages": [
                          {"role": "system", "content": FALLBACK_SYSTEM_PROMPT},
                          {"role": "user", "content": user_prompt},
                      ],
                      "temperature": 0.1,
                      "max_tokens": 1024,
                  },
              )
    """
    # TODO: Enable when Groq API key is added by friend
    # For now, log and return empty — regex-only mode
    log.info("llm_fallback_disabled", reason="Waiting for Groq API integration")
    return []
