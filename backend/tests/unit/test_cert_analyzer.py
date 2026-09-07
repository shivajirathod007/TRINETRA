"""Smoke tests for CertAnalyzer — instantiate and call analyze() without network."""

from unittest.mock import patch

from engine.scanners.cert_analyzer import CertAnalyzer, CertInfo


def test_analyze_returns_empty_result_when_no_chain_fetched():
    """No network in CI: an unreachable host must degrade to an empty CertInfo."""
    analyzer = CertAnalyzer()

    with patch.object(analyzer, "_fetch_chain", return_value=[]):
        info = analyzer.analyze("unreachable.invalid", port=443)

    assert isinstance(info, CertInfo)
    assert info.subject_cn == "unreachable.invalid"
    assert info.signature_algorithm == "UNKNOWN"
    assert info.key_length_bits is None


def test_analyze_swallows_fetch_errors():
    analyzer = CertAnalyzer()

    with patch.object(analyzer, "_fetch_chain", side_effect=OSError("connection refused")):
        info = analyzer.analyze("broken.invalid", port=443)

    assert isinstance(info, CertInfo)
    assert info.subject_cn == "broken.invalid"
