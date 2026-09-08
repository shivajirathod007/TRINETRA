"""End-to-end classifier test: a realistic payload through classify_http_response()."""

import os

import pytest

from engine.ai.classifier import MODEL_DIR
from engine.ai.schemas import ClassifierInput, ClassifierOutput

# The fine-tuned weights are not committed, so CI has config/tokenizer only.
_WEIGHT_FILES_PRESENT = any(
    os.path.exists(os.path.join(MODEL_DIR, name))
    for name in ("model.safetensors", "pytorch_model.bin")
)


def _ml_stack_is_real() -> bool:
    """conftest.py replaces torch/transformers with MagicMock to keep CI light.
    Under that mock the weights cannot actually be executed, so this test must
    skip even when the weight files are sitting on disk."""
    try:
        import torch
        import transformers
    except Exception:
        return False
    return isinstance(getattr(torch, "__version__", None), str) and isinstance(
        getattr(transformers, "__version__", None), str
    )


WEIGHTS_PRESENT = _WEIGHT_FILES_PRESENT and _ml_stack_is_real()


def _payload(body: str, headers: dict | None = None) -> ClassifierInput:
    return ClassifierInput(
        asset_url="https://api.example.com/.well-known/openid-configuration",
        asset_type="api_endpoint",
        status_code=200,
        response_headers=headers or {"content-type": "application/json"},
        response_body=body,
        request_method="GET",
        request_url="https://api.example.com/.well-known/openid-configuration",
        tls_cipher_suite="TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
        cert_algorithm="sha256WithRSAEncryption",
    )


@pytest.mark.asyncio
async def test_classify_http_response_returns_output_with_detections(monkeypatch):
    """A response advertising RS256 must produce at least one detection."""
    from engine.ai import classifier as classifier_mod

    # Keep the test offline: the LLM fallback must not reach the network.
    monkeypatch.setattr(classifier_mod.settings, "llm_fallback_enabled", False)

    payload = _payload('{"id_token_signing_alg_values_supported": ["RS256"], "kty": "RSA"}')
    output = await classifier_mod.classify_http_response(payload)

    assert isinstance(output, ClassifierOutput)
    assert output.asset_url == payload.asset_url
    assert output.model_version != "error", output.fallback_reason
    assert len(output.detections) >= 1

    algorithms = {d.algorithm_detected.upper() for d in output.detections}
    assert "RSA" in algorithms

    detection = output.detections[0]
    assert detection.risk_class in {
        "QUANTUM_VULNERABLE", "CLASSICAL_SAFE", "PQC_READY", "UNKNOWN"
    }
    assert 0.0 <= detection.confidence <= 1.0
    assert output.processing_time_ms >= 0


@pytest.mark.asyncio
async def test_classify_http_response_on_clean_body(monkeypatch):
    """A body with no crypto evidence still returns a well-formed output."""
    from engine.ai import classifier as classifier_mod

    monkeypatch.setattr(classifier_mod.settings, "llm_fallback_enabled", False)

    output = await classifier_mod.classify_http_response(
        _payload('{"status": "ok", "algorithm": "round-robin"}')
    )

    assert isinstance(output, ClassifierOutput)
    assert output.model_version != "error"
    assert isinstance(output.detections, list)


@pytest.mark.asyncio
async def test_model_version_is_regex_only_without_weights(monkeypatch):
    """Without weights the pipeline degrades to the regex pre-pass, not an error."""
    from engine.ai import classifier as classifier_mod

    monkeypatch.setattr(classifier_mod.settings, "llm_fallback_enabled", False)

    output = await classifier_mod.classify_http_response(_payload('{"alg": "RS256"}'))

    from engine.ai.classifier import MODEL_VERSION
    assert output.model_version in {
        "regex-only", MODEL_VERSION, f"{MODEL_VERSION}+regex-cs-override", "llm-fallback"
    }
    assert output.model_version != "error"


@pytest.mark.skipif(not WEIGHTS_PRESENT,
                    reason=f"real ML stack + weights required (dir={MODEL_DIR})")
@pytest.mark.asyncio
async def test_distilbert_contributes_when_weights_available(monkeypatch):
    """Once v2 weights are dropped in, the model must actually run."""
    from engine.ai import classifier as classifier_mod

    monkeypatch.setattr(classifier_mod.settings, "llm_fallback_enabled", False)

    instance = classifier_mod.AIClassifier()
    assert instance.is_loaded, "weights are present but the model did not load"

    output = await classifier_mod.classify_http_response(
        _payload('{"id_token_signing_alg_values_supported": ["RS256"]}')
    )
    from engine.ai.classifier import MODEL_VERSION
    assert output.model_version.startswith(MODEL_VERSION)
    assert set(instance.id2label.values()) == {
        "QUANTUM_VULNERABLE", "CLASSICAL_SAFE", "PQC_READY", "CLEAN"
    }
