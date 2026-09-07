"""The LLM fallback must distinguish HTTP errors, timeouts and 'nothing found'."""

import httpx
import pytest

from core.config import settings
from engine.ai.llm_fallback import llm_classify
from engine.ai.schemas import ClassifierInput


@pytest.fixture
def payload():
    return ClassifierInput(
        asset_url="https://test.com",
        asset_type="web_portal",
        status_code=200,
        request_method="GET",
        request_url="https://test.com",
        response_headers={"Content-Type": "text/html"},
        response_body="hello",
    )


@pytest.fixture
def enabled_with_key(monkeypatch):
    monkeypatch.setattr(settings, "llm_fallback_enabled", True)
    monkeypatch.setattr(settings, "anthropic_api_key", "sk-ant-test")


def _mock_transport(monkeypatch, handler):
    """Route every httpx.AsyncClient through a mock transport."""
    original_init = httpx.AsyncClient.__init__

    def patched_init(self, *args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(handler)
        original_init(self, *args, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "__init__", patched_init)


@pytest.mark.asyncio
async def test_disabled_fallback_returns_immediately(payload, monkeypatch, capsys):
    monkeypatch.setattr(settings, "llm_fallback_enabled", False)

    def handler(request):  # pragma: no cover — must never be reached
        raise AssertionError("network was hit while fallback was disabled")

    _mock_transport(monkeypatch, handler)

    assert await llm_classify(payload) == []
    assert "llm_fallback_disabled" in capsys.readouterr().out


@pytest.mark.asyncio
async def test_http_error_is_logged_with_status_and_body(payload, enabled_with_key, monkeypatch, capsys):
    _mock_transport(
        monkeypatch,
        lambda request: httpx.Response(401, text='{"error":"invalid x-api-key"}'),
    )

    assert await llm_classify(payload) == []

    out = capsys.readouterr().out
    assert "llm_fallback_http_error" in out
    assert "401" in out
    assert "invalid x-api-key" in out


@pytest.mark.asyncio
async def test_timeout_is_logged_distinctly(payload, enabled_with_key, monkeypatch, capsys):
    def handler(request):
        raise httpx.ReadTimeout("timed out", request=request)

    _mock_transport(monkeypatch, handler)

    assert await llm_classify(payload) == []

    out = capsys.readouterr().out
    assert "llm_fallback_timeout" in out
    assert "llm_fallback_http_error" not in out


@pytest.mark.asyncio
async def test_empty_result_is_not_logged_as_an_error(payload, enabled_with_key, monkeypatch, capsys):
    """'No crypto detected' must stay distinguishable from a transport failure."""
    _mock_transport(
        monkeypatch,
        lambda request: httpx.Response(200, json={"content": [{"text": "[]"}]}),
    )

    assert await llm_classify(payload) == []

    out = capsys.readouterr().out
    assert "llm_fallback_http_error" not in out
    assert "llm_fallback_timeout" not in out
    assert "llm_fallback_failed" not in out


def test_startup_config_log_names_model_and_endpoint(capsys):
    from engine.ai.llm_fallback import ANTHROPIC_MESSAGES_ENDPOINT, log_llm_fallback_config

    log_llm_fallback_config()

    out = capsys.readouterr().out
    assert "llm_fallback_config" in out
    assert settings.llm_model in out
    assert ANTHROPIC_MESSAGES_ENDPOINT in out
