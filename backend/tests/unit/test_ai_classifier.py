import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from engine.ai.classifier import AIClassifier
from engine.ai.schemas import SingleDetection

@pytest.fixture
def fake_ai_classifier():
    classifier = AIClassifier()
    # Ensure it doesn't load real models for tests
    classifier.is_loaded = False
    return classifier

def test_ai_classifier_rule_based_detection(fake_ai_classifier):
    # The CRYPTO_PATTERNS inside ai_classifier should match some regex
    # Based on the code, if it doesn't load the model, it runs rule-based pre-pass
    from engine.ai.patterns import CRYPTO_PATTERNS
    # Temporarily set a pattern just for our test, or rely on existing ones
    # Let's test predict with an empty string
    detections, max_conf = fake_ai_classifier.predict("")
    assert len(detections) == 0
    assert max_conf == 0.0

@pytest.mark.asyncio
async def test_classify_http_response_error_handling():
    # Test the main entry point with error
    from engine.ai.classifier import classify_http_response
    from engine.ai.schemas import ClassifierInput

    payload = ClassifierInput(
        asset_url="https://test.com",
        asset_type="web_portal",
        status_code=200,
        request_method="GET",
        request_url="https://test.com",
        response_headers={"Content-Type": "text/html"},
        response_body="hello"
    )
    
    with patch('engine.ai.classifier.AIClassifier') as mock_cls:
        mock_cls.side_effect = Exception("Mock error")
        output = await classify_http_response(payload)
        
        assert output.asset_url == "https://test.com"
        assert len(output.detections) == 0
        assert output.model_version == "error"
        assert "classifier_error:Mock error" in output.fallback_reason


# ─────────────────────────────────────────────────────────────────────────────
# predict() contract: always returns (list, float), never None
# ─────────────────────────────────────────────────────────────────────────────

def _payload(body="hello world"):
    from engine.ai.schemas import ClassifierInput
    return ClassifierInput(
        asset_url="https://test.com",
        asset_type="web_portal",
        status_code=200,
        request_method="GET",
        request_url="https://test.com",
        response_headers={"Content-Type": "text/html"},
        response_body=body,
    )


def test_predict_returns_tuple_when_model_not_loaded(fake_ai_classifier):
    """Unloaded model path: regex-only detections, still a (list, float) tuple."""
    result = fake_ai_classifier.predict("server uses RSA and MD5")

    assert result is not None
    detections, max_conf = result
    assert isinstance(detections, list)
    assert isinstance(max_conf, float)
    assert len(detections) >= 1
    assert max_conf == 1.0


def test_predict_returns_tuple_when_model_loaded(fake_ai_classifier):
    """Loaded model path used to fall off the end of the function and return None."""
    model_detection = SingleDetection(
        algorithm_detected="ECDSA",
        quantum_safe=False,
        risk_class="QUANTUM_VULNERABLE",
        confidence=0.42,
        location="response_body_or_header",
        evidence_text="Detected via distilbert_model",
        reason="ECDSA detected by distilbert_model",
    )

    fake_ai_classifier.is_loaded = True
    try:
        with patch.object(fake_ai_classifier, "_predict_model", return_value=(model_detection, 0.42)):
            result = fake_ai_classifier.predict("nothing interesting here")
    finally:
        fake_ai_classifier.is_loaded = False

    assert result is not None
    detections, max_conf = result
    assert isinstance(detections, list)
    assert isinstance(max_conf, float)
    assert model_detection in detections
    assert max_conf == pytest.approx(0.42)


def test_predict_returns_tuple_on_empty_text(fake_ai_classifier):
    result = fake_ai_classifier.predict("")
    assert result == ([], 0.0)


# ─────────────────────────────────────────────────────────────────────────────
# LLM fallback trigger
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_fallback_fires_when_max_conf_is_zero():
    """max_conf == 0.0 (nothing detected) is exactly when fallback is most useful."""
    from engine.ai.classifier import classify_http_response

    fallback = AsyncMock(return_value=[])
    with patch("engine.ai.classifier.AIClassifier") as mock_cls, \
         patch("engine.ai.classifier.llm_classify", fallback):
        mock_cls.return_value.predict.return_value = ([], 0.0)
        mock_cls.return_value.tokenizer = None
        await classify_http_response(_payload("nothing crypto related"))

    fallback.assert_awaited_once()


@pytest.mark.asyncio
async def test_fallback_not_fired_on_high_confidence():
    from engine.ai.classifier import classify_http_response

    detection = SingleDetection(
        algorithm_detected="RSA",
        quantum_safe=False,
        risk_class="QUANTUM_VULNERABLE",
        confidence=1.0,
        location="response_body_or_header",
        evidence_text="Detected via regex_pattern_match",
        reason="RSA detected by regex_pattern_match",
    )

    fallback = AsyncMock(return_value=[])
    with patch("engine.ai.classifier.AIClassifier") as mock_cls, \
         patch("engine.ai.classifier.llm_classify", fallback):
        mock_cls.return_value.predict.return_value = ([detection], 1.0)
        mock_cls.return_value.tokenizer = None
        await classify_http_response(_payload("RSA everywhere"))

    fallback.assert_not_awaited()


# ─────────────────────────────────────────────────────────────────────────────
# model_version must reflect what actually contributed
# ─────────────────────────────────────────────────────────────────────────────

def _detection(evidence_text, algorithm="RSA", confidence=1.0):
    return SingleDetection(
        algorithm_detected=algorithm,
        quantum_safe=False,
        risk_class="QUANTUM_VULNERABLE",
        confidence=confidence,
        location="response_body_or_header",
        evidence_text=evidence_text,
        reason="test detection",
    )


@pytest.mark.asyncio
async def test_model_version_regex_only():
    from engine.ai.classifier import classify_http_response

    with patch("engine.ai.classifier.AIClassifier") as mock_cls, \
         patch("engine.ai.classifier.llm_classify", AsyncMock(return_value=[])):
        mock_cls.return_value.predict.return_value = (
            [_detection("Detected via regex_pattern_match")], 1.0
        )
        mock_cls.return_value.tokenizer = None
        output = await classify_http_response(_payload("RSA"))

    assert output.model_version == "regex-only"
    assert output.fallback_used is False


@pytest.mark.asyncio
async def test_model_version_distilbert_when_model_contributed():
    from engine.ai.classifier import classify_http_response

    with patch("engine.ai.classifier.AIClassifier") as mock_cls, \
         patch("engine.ai.classifier.llm_classify", AsyncMock(return_value=[])):
        mock_cls.return_value.predict.return_value = (
            [
                _detection("Detected via regex_pattern_match"),
                _detection("Detected via distilbert_model", algorithm="ECDSA", confidence=0.91),
            ],
            0.91,
        )
        mock_cls.return_value.tokenizer = None
        output = await classify_http_response(_payload("ECDSA"))

    assert output.model_version == "distilbert-crypto-v1"


@pytest.mark.asyncio
async def test_model_version_llm_fallback_when_fallback_replaces_results():
    from engine.ai.classifier import classify_http_response

    llm_detection = _detection("Detected via llm", algorithm="ECDHE", confidence=0.8)
    with patch("engine.ai.classifier.AIClassifier") as mock_cls, \
         patch("engine.ai.classifier.llm_classify", AsyncMock(return_value=[llm_detection])):
        mock_cls.return_value.predict.return_value = ([], 0.0)
        mock_cls.return_value.tokenizer = None
        output = await classify_http_response(_payload("opaque body"))

    assert output.model_version == "llm-fallback"
    assert output.fallback_used is True
    assert output.detections == [llm_detection]
