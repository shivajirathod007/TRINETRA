"""Smoke tests for CBOMGenerator — build a CBOM entry from a minimal fixture."""

from engine.analysis.cbom_generator import CBOMGenerator
from engine.analysis.exposure_scorer import ExposureScorer
from engine.analysis.hndl_engine import HNDLEngine
from engine.discovery.asset_classifier import ClassifiedAsset


def _minimal_asset() -> ClassifiedAsset:
    return ClassifiedAsset(
        fqdn="api.example.com",
        ip_address="93.184.216.34",
        port=443,
        asset_type="api_endpoint",
        asset_url="https://api.example.com",
        is_shadow_asset=False,
    )


def test_generate_asset_entry_smoke():
    asset = _minimal_asset()
    score_result = ExposureScorer().score(
        asset_url=asset.asset_url,
        algorithm="sha256WithRSAEncryption",
        asset_type=asset.asset_type,
        cert_expiry_days=180,
    )
    hndl_result = HNDLEngine().calculate(
        asset_url=asset.asset_url,
        algorithm="sha256WithRSAEncryption",
        cert_expiry_days=180,
    )

    entry = CBOMGenerator().generate_asset_entry(
        asset=asset,
        tls_result=None,
        cert_info=None,
        api_result=None,
        ssh_result=None,
        score_result=score_result,
        hndl_result=hndl_result,
        scan_id="00000000-0000-4000-8000-000000000000",
    )

    assert entry["bomFormat"] == "CycloneDX"
    assert entry["specVersion"] == "1.6"
    assert entry["asset"]["fqdn"] == "api.example.com"
    # Unscanned sections degrade gracefully rather than raising
    assert entry["tls"] == {"status": "not_scanned"}


def test_generate_organization_cbom_smoke():
    cbom = CBOMGenerator().generate_organization_cbom(
        domain="example.com",
        scan_id="00000000-0000-4000-8000-000000000000",
        asset_entries=[],
        organization_score=42.0,
    )

    assert cbom["bomFormat"] == "CycloneDX"
    assert cbom["organization_summary"]["domain"] == "example.com"
    assert cbom["organization_summary"]["total_assets_scanned"] == 0
    assert cbom["components"] == []
