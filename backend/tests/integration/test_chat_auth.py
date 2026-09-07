"""The /chat/message endpoint requires auth; /chat/health stays public."""

import pytest
from fastapi.testclient import TestClient

from api.main import app

# TestClient is not used as a context manager on purpose: that would run the
# lifespan hook (migrations, DistilBERT warm-up), which these tests do not need.
client = TestClient(app)


def test_chat_message_requires_auth():
    resp = client.post("/api/v1/chat/message", json={"message": "hello"})
    assert resp.status_code == 401


def test_chat_message_rejects_invalid_token():
    resp = client.post(
        "/api/v1/chat/message",
        json={"message": "hello"},
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert resp.status_code == 401


def test_chat_health_is_public():
    resp = client.get("/api/v1/chat/health")
    assert resp.status_code == 200
    assert resp.json()["service"] == "JARSH Chatbot"
