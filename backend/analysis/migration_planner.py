from typing import Dict, Any, List

def plan_migration(asset_details: Dict[str, Any], current_algo: str) -> List[str]:
    """
    Generates step-by-step remediation instructions for an asset.
    """
    steps = [
        f"1. Audit systems dependent on {current_algo} for asset {asset_details.get('id')}.",
        "2. Identify hybrid key exchange support (e.g., X25519Kyber768Draft00) in TLS library.",
        "3. Update infrastructure to use NIST recommended FIPS 203/204 algorithms.",
        "4. Deploy updated certificates and test client compatibility.",
        "5. Revoke older legacy certificates."
    ]
    return steps
