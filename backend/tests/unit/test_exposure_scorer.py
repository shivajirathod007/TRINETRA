"""Smoke tests for ExposureScorer — instantiate and run score() on a minimal fixture."""

from engine.analysis.exposure_scorer import ExposureScorer, ExposureScoreResult


def test_exposure_scorer_score_smoke():
    scorer = ExposureScorer()

    result = scorer.score(
        asset_url="https://api.example.com",
        algorithm="sha256WithRSAEncryption",
        asset_type="api_endpoint",
        cert_expiry_days=180,
    )

    assert isinstance(result, ExposureScoreResult)
    assert result.asset_url == "https://api.example.com"
    assert 0.0 <= result.score <= 100.0
    assert result.risk_level in {"CRITICAL", "HIGH", "MEDIUM", "LOW", "SAFE"}
    assert result.breakdown.final_score == result.score
    assert result.hndl_urgency in {"IMMEDIATE", "URGENT", "PLANNED", "MONITOR"}


def test_exposure_scorer_pqc_scores_lower_than_rsa():
    scorer = ExposureScorer()
    common = dict(asset_type="api_endpoint", cert_expiry_days=180)

    rsa = scorer.score(asset_url="https://a.example.com", algorithm="RSA-2048", **common)
    pqc = scorer.score(asset_url="https://b.example.com", algorithm="ML-KEM-768", **common)

    assert pqc.score < rsa.score


def test_score_organization_handles_empty_list():
    assert ExposureScorer().score_organization([]) == 0.0
