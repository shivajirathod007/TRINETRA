import aiohttp
import asyncio
from typing import List, Dict

async def fetch_ct_logs(domain: str) -> List[Dict]:
    """
    Query crt.sh Certificate Transparency logs asynchronously.
    Rule: ct_log_miner.py must query https://crt.sh/?q=%.{domain}&output=json
    """
    url = f"https://crt.sh/?q=%.{domain}&output=json"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=30) as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    return []
    except Exception as e:
        # TODO: real logging
        print(f"Error fetching CT logs for {domain}: {e}")
        return []

if __name__ == "__main__":
    # Test script
    res = asyncio.run(fetch_ct_logs("example.com"))
    print(f"Found {len(res)} subdomains via CT logs")
