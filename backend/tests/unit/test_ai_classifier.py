import pytest
from unittest.mock import patch, MagicMock
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
