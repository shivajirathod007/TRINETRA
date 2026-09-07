"""Smoke tests for HNDLEngine — instantiate and run calculate() on a minimal fixture."""

from engine.analysis.hndl_engine import HNDLEngine, HNDLRiskResult


def test_hndl_engine_calculate_smoke():
    engine = HNDLEngine()

    result = engine.calculate(
        asset_url="https://api.example.com",
        algorithm="sha256WithRSAEncryption",
        cert_expiry_days=180,
    )

    assert isinstance(result, HNDLRiskResult)
    assert result.asset_url == "https://api.example.com"
    assert result.cert_expiry_days == 180
    assert result.urgency_level in {"IMMEDIATE", "URGENT", "PLANNED", "MONITOR"}
    assert result.primary_deadline
    assert isinstance(result.mosca_act_now, bool)
    assert result.mosca_x >= 0.0
    assert result.mosca_y > 0.0


def test_hndl_engine_pqc_algorithm_is_not_urgent():
    engine = HNDLEngine()

    vulnerable = engine.calculate(
        asset_url="https://legacy.example.com",
        algorithm="RSA-2048",
        cert_expiry_days=30,
        data_sensitivity_tier="transaction",
    )
    pqc_ready = engine.calculate(
        asset_url="https://modern.example.com",
        algorithm="ML-KEM-768",
        cert_expiry_days=30,
        data_sensitivity_tier="transaction",
    )

    assert vulnerable.data_decryptable_in_years is not None
    assert pqc_ready.data_decryptable_in_years is None
