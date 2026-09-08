"""Unit tests for the training data collector (scripts/capture_training_data.py)."""

import base64
import json
import sys
from pathlib import Path

import pytest

# scripts/ is not a package; add it to the path the same way the script expects
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))

from capture_training_data import (  # noqa: E402
    BODY_TRUNCATE_CHARS,
    REDACTED,
    RedactionCounter,
    build_record,
    has_crypto_signal,
    is_collectable_content_type,
    redact_body,
    redact_headers,
    truncate_body,
)


def _jwt(alg: str = "RS256") -> str:
    """Build a syntactically real JWT whose header declares `alg`."""
    def seg(obj):
        return base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip("=")

    header = seg({"alg": alg, "typ": "JWT"})
    payload = seg({"sub": "1234567890", "name": "Test User", "iat": 1516239022})
    signature = "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    return f"{header}.{payload}.{signature}"


# ─────────────────────────────────────────────────────────────────────────────
# Header redaction
# ─────────────────────────────────────────────────────────────────────────────

def test_authorization_header_is_redacted():
    out = redact_headers({"Authorization": "Bearer abcdefghijklmnopqrstuvwxyz123456"})
    assert out["Authorization"] == REDACTED


def test_cookie_and_set_cookie_headers_are_redacted():
    out = redact_headers({
        "Cookie": "session=abc123; theme=dark",
        "Set-Cookie": "session=xyz789; HttpOnly; Secure",
    })
    assert out["Cookie"] == REDACTED
    assert out["Set-Cookie"] == REDACTED


@pytest.mark.parametrize("name", [
    "X-Api-Key", "x-api-key", "X-Auth-Token", "X-Access-Token",
    "X-Csrf-Token", "Api-Key", "X-Amz-Security-Token",
])
def test_api_key_style_headers_are_redacted(name):
    assert redact_headers({name: "s3cr3t-value-here"})[name] == REDACTED


def test_header_names_containing_secret_are_redacted():
    out = redact_headers({"X-Client-Secret": "abc", "X-Db-Password": "hunter2"})
    assert out["X-Client-Secret"] == REDACTED
    assert out["X-Db-Password"] == REDACTED


def test_benign_headers_are_preserved():
    out = redact_headers({"content-type": "application/json", "server": "nginx"})
    assert out["content-type"] == "application/json"
    assert out["server"] == "nginx"


def test_secrets_inside_non_sensitive_headers_are_still_redacted():
    """A token can hide in e.g. Location; header values go through body redaction too."""
    out = redact_headers({"Location": f"https://x.test/cb?id_token={_jwt('RS256')}"})
    assert "eyJ" not in out["Location"]
    assert "[JWT alg=RS256]" in out["Location"]


def test_redact_headers_returns_dict_of_str_not_string():
    """ClassifierInput.response_headers is dict[str, str] -- never a stringified dict."""
    out = redact_headers({"content-type": "application/json", "x-count": 5})

    assert isinstance(out, dict)
    assert not isinstance(out, str)
    assert all(isinstance(k, str) for k in out)
    assert all(isinstance(v, str) for v in out.values())


# ─────────────────────────────────────────────────────────────────────────────
# JWT extraction
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("alg", ["RS256", "ES256", "HS512", "PS384", "EdDSA"])
def test_jwt_is_replaced_by_its_algorithm(alg):
    body = f'{{"id_token": "{_jwt(alg)}"}}'
    out = redact_body(body)

    assert out == f'{{"id_token": "[JWT alg={alg}]"}}'
    assert "eyJ" not in out


def test_jwt_with_undecodable_header_still_redacted():
    body = "token=eyJnotvalidbase64.eyJalsonotvalid.signaturepart"
    out = redact_body(body)

    assert "eyJnotvalidbase64" not in out
    assert "[JWT alg=" in out


def test_multiple_jwts_all_redacted():
    body = f"a={_jwt('RS256')} b={_jwt('ES256')}"
    out = redact_body(body)

    assert out == "a=[JWT alg=RS256] b=[JWT alg=ES256]"


def test_bearer_token_is_redacted():
    out = redact_body("Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123456789")
    assert out == "Authorization: Bearer [REDACTED_TOKEN]"


def test_short_bearer_value_is_not_matched():
    """Under 20 chars is not a credential worth redacting."""
    assert redact_body("Bearer short") == "Bearer short"


# ─────────────────────────────────────────────────────────────────────────────
# Email + API key redaction
# ─────────────────────────────────────────────────────────────────────────────

def test_email_addresses_are_redacted():
    out = redact_body("Contact admin@example.com or ops.team+alerts@sub.example.co.uk")
    assert "@" not in out
    assert out.count("[EMAIL_REDACTED]") == 2


def test_long_hex_string_is_redacted_as_key():
    out = redact_body("api_key=0123456789abcdef0123456789abcdef")
    assert out == "api_key=[KEY_REDACTED]"


def test_long_base64_string_is_redacted_as_key():
    out = redact_body("secret=" + "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0")
    assert "[KEY_REDACTED]" in out


def test_short_hex_is_not_redacted():
    assert redact_body("color=ff00ff") == "color=ff00ff"


# ─────────────────────────────────────────────────────────────────────────────
# Algorithm names must survive -- they are the classification signal
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("algo", [
    "RS256", "ES256", "PS512", "HS384", "EdDSA",
    "RSA", "RSA-2048", "ECDSA", "ECDHE", "X25519",
    "ML-KEM-768", "ML-DSA-65", "Kyber768", "Dilithium3", "SPHINCS+",
    "X25519Kyber768", "AES-256-GCM", "ChaCha20", "SHA-256", "MD5", "3DES",
])
def test_algorithm_names_are_never_redacted(algo):
    assert algo in redact_body(f"alg={algo} negotiated")


def test_algorithm_list_survives_redaction_intact():
    body = json.dumps({
        "id_token_signing_alg_values_supported": ["RS256", "ES256", "PS256"],
        "kem": "X25519Kyber768",
    })
    out = redact_body(body)

    for algo in ("RS256", "ES256", "PS256", "X25519Kyber768"):
        assert algo in out


def test_redaction_preserves_algorithms_while_removing_secrets():
    body = f'{{"alg": "RS256", "token": "{_jwt()}", "key": "0123456789abcdef0123456789abcdef"}}'
    out = redact_body(body)

    assert "RS256" in out            # signal kept
    assert "eyJ" not in out          # JWT gone
    assert "0123456789abcdef" not in out  # key gone


# ─────────────────────────────────────────────────────────────────────────────
# Redaction counting
# ─────────────────────────────────────────────────────────────────────────────

def test_redaction_counter_tallies_each_kind():
    counter = RedactionCounter()
    redact_body(f"{_jwt()} admin@example.com Bearer abcdefghijklmnopqrstuvwxyz123", counter)

    counts = counter.as_dict()
    assert counts.get("jwt") == 1
    assert counts.get("email") == 1
    assert counts.get("bearer") == 1
    assert counter.total() >= 3


def test_counter_records_header_redactions():
    counter = RedactionCounter()
    redact_headers({"Authorization": "Bearer x", "Cookie": "a=b"}, counter)
    assert counter.as_dict().get("header") == 2


# ─────────────────────────────────────────────────────────────────────────────
# Body truncation
# ─────────────────────────────────────────────────────────────────────────────

def test_body_is_truncated_at_3000_chars():
    assert BODY_TRUNCATE_CHARS == 3000
    assert len(truncate_body("x" * 10_000)) == 3000


def test_short_body_is_untouched():
    assert truncate_body("short body") == "short body"


def test_empty_body_is_safe():
    assert truncate_body("") == ""
    assert truncate_body(None) == ""


def test_record_body_never_exceeds_limit():
    record = build_record(
        url="https://example.com/",
        domain="example.com",
        status_code=200,
        headers={"content-type": "text/html"},
        body=truncate_body("y" * 99_999),
        content_type="text/html",
    )
    assert len(record["response_body"]) == 3000


# ─────────────────────────────────────────────────────────────────────────────
# Binary content types are skipped
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("ct", [
    "text/html", "text/html; charset=utf-8", "text/plain", "text/css",
    "application/json", "application/json; charset=utf-8",
    "application/ld+json", "application/jwk-set+json", "application/xml",
])
def test_text_content_types_are_collected(ct):
    assert is_collectable_content_type(ct) is True


@pytest.mark.parametrize("ct", [
    "image/png", "image/jpeg", "image/svg+xml", "image/gif", "image/webp",
    "application/pdf", "application/zip", "application/gzip",
    "application/octet-stream", "font/woff2", "video/mp4", "audio/mpeg",
    "application/x-tar", "application/vnd.ms-excel",
])
def test_binary_content_types_are_skipped(ct):
    assert is_collectable_content_type(ct) is False


def test_missing_content_type_is_skipped():
    assert is_collectable_content_type("") is False
    assert is_collectable_content_type(None) is False


# ─────────────────────────────────────────────────────────────────────────────
# Record shape matches ClassifierInput expectations
# ─────────────────────────────────────────────────────────────────────────────

def test_record_has_all_required_fields():
    record = build_record(
        url="https://example.com/api",
        domain="example.com",
        status_code=200,
        headers={"content-type": "application/json"},
        body='{"ok": true}',
        content_type="application/json",
    )

    assert set(record) == {
        "url", "method", "status_code", "response_headers", "response_body",
        "content_type", "timestamp", "domain", "collection_source",
    }
    assert record["collection_source"] == "trinetra_collector_v1"
    assert record["method"] == "GET"
    assert isinstance(record["status_code"], int)


def test_record_headers_survive_json_round_trip_as_dict():
    """The saved file must deserialise headers as a dict, not a string."""
    record = build_record(
        url="https://example.com/",
        domain="example.com",
        status_code=200,
        headers={"content-type": "text/html", "server": "nginx"},
        body="<html></html>",
        content_type="text/html",
    )
    reloaded = json.loads(json.dumps(record))

    assert isinstance(reloaded["response_headers"], dict)
    assert reloaded["response_headers"]["server"] == "nginx"


def test_record_is_accepted_by_classifier_input():
    """The collected shape must validate against the real schema."""
    from engine.ai.schemas import ClassifierInput

    record = build_record(
        url="https://example.com/api",
        domain="example.com",
        status_code=200,
        headers={"content-type": "application/json"},
        body='{"alg": "RS256"}',
        content_type="application/json",
    )

    payload = ClassifierInput(
        asset_url=record["url"],
        asset_type="api_endpoint",
        status_code=record["status_code"],
        response_headers=record["response_headers"],
        response_body=record["response_body"],
        request_method=record["method"],
        request_url=record["url"],
    )
    assert payload.response_headers == {"content-type": "application/json"}


def test_stringified_headers_are_rejected_by_the_schema():
    """Guards the prod bug: str(dict) fails validation, which is why we emit a dict."""
    from pydantic import ValidationError

    from engine.ai.schemas import ClassifierInput

    with pytest.raises(ValidationError):
        ClassifierInput(
            asset_url="https://example.com",
            asset_type="api_endpoint",
            status_code=200,
            response_headers=str({"content-type": "application/json"}),
            response_body="",
            request_method="GET",
            request_url="https://example.com",
        )


# ─────────────────────────────────────────────────────────────────────────────
# has_crypto_signal hint
# ─────────────────────────────────────────────────────────────────────────────

def test_crypto_signal_detected_in_body():
    assert has_crypto_signal({}, '{"alg": "RSA"}') is True


def test_crypto_signal_detected_in_headers():
    assert has_crypto_signal({"x-kex": "ECDHE"}, "") is True


def test_no_crypto_signal_in_plain_text():
    assert has_crypto_signal({"content-type": "text/html"}, "Hello world") is False


def test_crypto_signal_reflects_classifier_substring_false_positive():
    """
    'describes' contains DES. The hint mirrors the classifier's own regex, so this
    is True by design -- it flags the sample as worth labelling as a hard negative.
    """
    assert has_crypto_signal({}, "This section describes the onboarding flow") is True
