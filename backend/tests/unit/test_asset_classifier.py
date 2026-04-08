import pytest
from unittest.mock import AsyncMock, patch
from engine.discovery.asset_classifier import AssetClassifier, ClassifiedAsset
from engine.discovery.port_scanner import PortScanResult

@pytest.fixture
def classifier():
    return AssetClassifier()

@pytest.mark.asyncio
async def test_classify_all_basic(classifier):
    # Basic API test
    pr = PortScanResult(
        ip_address="192.168.1.1",
        fqdn="api.example.com",
        open_ports=[443],
        has_https=True,
        has_ssh=False
    )
    
    with patch('engine.discovery.asset_classifier.AssetClassifier._http_fingerprint', new_callable=AsyncMock) as mock_fp:
        mock_fp.return_value = {
            "status": 200,
            "server": "nginx",
            "content_type": "application/json",
            "body_preview": '{"status": "ok"}',
            "headers": {"content-type": "application/json"},
            "url": "https://api.example.com"
        }
        
        results = await classifier.classify_all([pr], shadow_fqdns={"api.example.com"})
        
        assert len(results) == 1
        asset = results[0]
        assert asset.fqdn == "api.example.com"
        assert asset.asset_type == "api_endpoint"
        assert asset.is_shadow_asset is True
        assert asset.needs_tls_scan is True
        assert asset.needs_api_scan is True

@pytest.mark.asyncio
async def test_vpn_detection(classifier):
    pr = PortScanResult(
        ip_address="192.168.1.2",
        fqdn="vpn.example.com",
        open_ports=[443],
        has_https=True,
        has_ssh=False
    )
    
    with patch('engine.discovery.asset_classifier.AssetClassifier._http_fingerprint', new_callable=AsyncMock) as mock_fp:
        # Simulate Palo Alto GlobalProtect
        mock_fp.return_value = {
            "status": 200,
            "body_preview": "/global-protect/login.esp",
            "headers": {},
            "url": "https://vpn.example.com/global-protect/login.esp"
        }
        
        results = await classifier.classify_all([pr], shadow_fqdns=set())
        
        assert len(results) == 1
        asset = results[0]
        assert asset.asset_type == "vpn_gateway"
        assert asset.vpn_type == "palo_alto_gp"
        assert asset.needs_vpn_scan is True
        assert asset.is_shadow_asset is False

@pytest.mark.asyncio
async def test_ssh_and_smtp_detection(classifier):
    pr = PortScanResult(
        ip_address="192.168.1.3",
        fqdn="mail.example.com",
        open_ports=[22, 25],
        has_https=False,
        has_ssh=True
    )
    
    results = await classifier.classify_all([pr], shadow_fqdns=set())
    
    # We should get one for SSH and one for SMTP
    assert len(results) == 2
    types = {r.asset_type for r in results}
    assert types == {"ssh_endpoint", "smtp_mta"}
    
    ssh_asset = next(r for r in results if r.asset_type == "ssh_endpoint")
    assert ssh_asset.port == 22
    assert ssh_asset.needs_ssh_scan is True
    
    smtp_asset = next(r for r in results if r.asset_type == "smtp_mta")
    assert smtp_asset.port == 25
    assert smtp_asset.needs_smtp_scan is True

