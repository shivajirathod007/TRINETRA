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

    from engine.ai.classifier import MODEL_VERSION
    assert output.model_version == MODEL_VERSION


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


# ─────────────────────────────────────────────────────────────────────────────
# ClassifierInput.response_headers must be a dict (regression: scan_tasks.py
# used to wrap it in str(), which failed validation on every live scan)
# ─────────────────────────────────────────────────────────────────────────────

def test_classifier_input_accepts_a_real_dict():
    from engine.ai.schemas import ClassifierInput

    headers = {"content-type": "application/json", "server": "nginx"}
    payload = ClassifierInput(
        asset_url="https://example.com/api",
        asset_type="api_endpoint",
        status_code=200,
        response_headers=headers,
        response_body='{"alg": "RS256"}',
        request_method="GET",
        request_url="https://example.com/api",
    )

    assert payload.response_headers == headers
    assert isinstance(payload.response_headers, dict)


def test_classifier_input_rejects_a_stringified_dict():
    """This is the exact shape that broke production."""
    from pydantic import ValidationError

    from engine.ai.schemas import ClassifierInput

    with pytest.raises(ValidationError):
        ClassifierInput(
            asset_url="https://example.com/api",
            asset_type="api_endpoint",
            status_code=200,
            response_headers=str({"content-type": "application/json"}),
            response_body="",
            request_method="GET",
            request_url="https://example.com/api",
        )


def test_scan_tasks_builds_headers_as_a_dict():
    """Guards the fix in workers/tasks/scan_tasks.py against regressing to str()."""
    import inspect

    from workers.tasks import scan_tasks

    source = inspect.getsource(scan_tasks)
    assert "response_headers=str(" not in source, \
        "scan_tasks.py is stringifying response_headers again"
    assert "response_headers={" in source


# ─────────────────────────────────────────────────────────────────────────────
# CLASSICAL_SAFE regex override (v2 scores 0.00 F1 on this class)
# ─────────────────────────────────────────────────────────────────────────────

def _cs_classifier():
    from engine.ai.classifier import AIClassifier
    c = AIClassifier()
    c.is_loaded = False
    return c


def test_classical_safe_patterns_produce_cs_detections(fake_ai_classifier):
    """These patterns did not exist before; no regex could emit CLASSICAL_SAFE."""
    detections, max_conf = fake_ai_classifier.predict("cipher: AES-256-GCM sha-256 chacha20")

    cs = [d for d in detections if d.risk_class == "CLASSICAL_SAFE"]
    assert cs, "no CLASSICAL_SAFE detection produced"
    assert {d.algorithm_detected for d in cs} >= {"AES", "SHA-2", "ChaCha20"}
    assert all(d.quantum_safe is False for d in cs)
    assert max_conf == 1.0


@pytest.mark.parametrize("text,expected", [
    ("alg: AES-256-GCM", "AES"),
    ("hash: SHA-384", "SHA-2"),
    ("aead: ChaCha20-Poly1305", "ChaCha20"),
    ("key: Ed25519", "Ed25519"),
    ("jwt alg HS256", "HMAC-SHA2"),
    ("kex: X25519", "X25519"),
])
def test_each_classical_pattern_matches(fake_ai_classifier, text, expected):
    detections, _ = fake_ai_classifier.predict(text)
    assert expected in {d.algorithm_detected for d in detections}


def test_x25519_pattern_does_not_fire_inside_pqc_hybrid(fake_ai_classifier):
    """X25519Kyber768 is PQC, not classical -- the word boundary must hold."""
    detections, _ = fake_ai_classifier.predict("kex: X25519Kyber768")
    assert "X25519" not in {d.algorithm_detected for d in detections}


def test_classical_patterns_use_word_boundaries(fake_ai_classifier):
    """The DES-in-'describes' bug class must not repeat."""
    detections, _ = fake_ai_classifier.predict(
        "this page describes phrases and releases in various modes"
    )
    assert not [d for d in detections if d.risk_class == "CLASSICAL_SAFE"]


def test_cs_override_annotates_when_model_disagrees():
    """Model says QUANTUM_VULNERABLE, regex says AES -> regex detection is kept + marked."""
    from engine.ai.classifier import REGEX_CS_OVERRIDE_NOTE, AIClassifier

    model_detection = SingleDetection(
        algorithm_detected="RSA", quantum_safe=False, risk_class="QUANTUM_VULNERABLE",
        confidence=0.88, location="response_body_or_header",
        evidence_text="Detected via distilbert_model", reason="model",
    )
    c = AIClassifier()
    c.is_loaded = True
    try:
        with patch.object(c, "_predict_model", return_value=(model_detection, 0.88)):
            detections, _ = c.predict("cipher: AES-256-GCM")
    finally:
        c.is_loaded = False

    cs = [d for d in detections if d.risk_class == "CLASSICAL_SAFE"]
    assert cs, "regex CLASSICAL_SAFE detection was dropped"
    assert all(REGEX_CS_OVERRIDE_NOTE in d.evidence_text for d in cs)
    # The model's own finding must survive -- never hide a quantum-vulnerable result
    assert model_detection in detections


def test_cs_override_not_marked_when_model_agrees():
    from engine.ai.classifier import REGEX_CS_OVERRIDE_NOTE, AIClassifier

    agreeing = SingleDetection(
        algorithm_detected="CLASSICAL_SAFE", quantum_safe=False, risk_class="CLASSICAL_SAFE",
        confidence=0.9, location="response_body_or_header",
        evidence_text="Detected via distilbert_model", reason="model",
    )
    c = AIClassifier()
    c.is_loaded = True
    try:
        with patch.object(c, "_predict_model", return_value=(agreeing, 0.9)):
            detections, _ = c.predict("cipher: AES-256-GCM")
    finally:
        c.is_loaded = False

    assert not any(REGEX_CS_OVERRIDE_NOTE in d.evidence_text for d in detections)


def test_cs_override_not_marked_when_model_unloaded(fake_ai_classifier):
    """No model verdict means no disagreement to record."""
    from engine.ai.classifier import REGEX_CS_OVERRIDE_NOTE

    detections, _ = fake_ai_classifier.predict("cipher: AES-256-GCM")
    assert not any(REGEX_CS_OVERRIDE_NOTE in d.evidence_text for d in detections)


@pytest.mark.asyncio
async def test_model_version_reports_cs_override():
    from engine.ai.classifier import (
        MODEL_VERSION, REGEX_CS_OVERRIDE_NOTE, classify_http_response,
    )

    overridden = SingleDetection(
        algorithm_detected="AES", quantum_safe=False, risk_class="CLASSICAL_SAFE",
        confidence=1.0, location="response_body_or_header",
        evidence_text=f"Detected via classical_safe_pattern_match | {REGEX_CS_OVERRIDE_NOTE}",
        reason="regex",
    )
    with patch("engine.ai.classifier.AIClassifier") as mock_cls, \
         patch("engine.ai.classifier.llm_classify", AsyncMock(return_value=[])):
        mock_cls.return_value.predict.return_value = ([overridden], 1.0)
        mock_cls.return_value.tokenizer = None
        output = await classify_http_response(_payload("AES-256-GCM"))

    assert output.model_version == f"{MODEL_VERSION}+regex-cs-override"


def test_model_version_tag_tracks_the_configured_dir():
    from engine.ai.classifier import MODEL_VERSION
    from core.config import settings

    if settings.ai_model_dir.endswith("_v2"):
        assert MODEL_VERSION == "distilbert-crypto-v2"
    else:
        assert MODEL_VERSION.startswith("distilbert-crypto-v")


@pytest.mark.parametrize("suite,expected", [
    ("TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384", {"AES", "SHA-2"}),
    ("TLS_AES_256_GCM_SHA384", {"AES", "SHA-2"}),
    ("TLS_CHACHA20_POLY1305_SHA256", {"ChaCha20", "Poly1305", "SHA-2"}),
    ("ECDHE-RSA-AES128-GCM-SHA256", {"AES", "SHA-2"}),
])
def test_classical_patterns_match_inside_cipher_suites(fake_ai_classifier, suite, expected):
    """\b does not fire against '_', which hid AES inside every TLS_* suite name."""
    detections, _ = fake_ai_classifier.predict(suite)
    assert expected <= {d.algorithm_detected for d in detections}


# ─────────────────────────────────────────────────────────────────────────────
# JWT signature algorithms + Windows auth schemes
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("text,label,risk", [
    ('{"alg":"RS256"}', "RS256", "QUANTUM_VULNERABLE"),
    ('{"alg":"RS512"}', "RS256", "QUANTUM_VULNERABLE"),
    ('{"alg":"ES384"}', "ES256", "QUANTUM_VULNERABLE"),
    ('{"alg":"PS512"}', "PS256", "QUANTUM_VULNERABLE"),
    ('{"alg":"HS256"}', "HS256", "CLASSICAL_SAFE"),
    ("WWW-Authenticate: NTLM", "NTLM", "QUANTUM_VULNERABLE"),
    ("WWW-Authenticate: Negotiate", "Negotiate", "QUANTUM_VULNERABLE"),
])
def test_jwt_and_auth_scheme_patterns(fake_ai_classifier, text, label, risk):
    detections, _ = fake_ai_classifier.predict(text)
    match = [d for d in detections if d.algorithm_detected == label]
    assert match, f"{label} not detected in {text!r}"
    assert match[0].risk_class == risk


def test_es256_does_not_match_inside_aes256(fake_ai_classifier):
    """The letter-only lookbehind must stop ES256 firing inside AES256."""
    detections, _ = fake_ai_classifier.predict('{"cipher":"AES256","suite":"TLS_AES_256_GCM_SHA384"}')
    assert "ES256" not in {d.algorithm_detected for d in detections}


def test_smoke_payload_yields_all_three_detections(fake_ai_classifier):
    """RS256 body + Negotiate/NTLM header -> three QUANTUM_VULNERABLE findings."""
    text = 'headers: www-authenticate: negotiate, ntlm\nbody: {"alg": "rs256"}'
    detections, _ = fake_ai_classifier.predict(text)
    found = {d.algorithm_detected for d in detections}
    assert {"RS256", "NTLM", "Negotiate"} <= found
    for d in detections:
        if d.algorithm_detected in {"RS256", "NTLM", "Negotiate"}:
            assert d.risk_class == "QUANTUM_VULNERABLE"
