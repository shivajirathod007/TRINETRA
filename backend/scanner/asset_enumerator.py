import dns.resolver
import dns.asyncresolver
from typing import List

async def enumerate_assets(domain: str) -> List[str]:
    """
    Performs DNS resolution and enumerates basic assets for a domain.
    """
    assets = []
    try:
        # A simple DNS lookup
        answers = await dns.asyncresolver.resolve(domain, 'A')
        for rdata in answers:
            assets.append(rdata.to_text())
    except Exception as e:
        print(f"Error enumerating {domain}: {e}")
        
    return assets
