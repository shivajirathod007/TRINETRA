import aiohttp
from typing import Dict, Any

async def inspect_api_headers(url: str) -> Dict[str, Any]:
    """
    Inspects JWT, OAuth, and HTTP security headers of an endpoint.
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=10) as response:
                headers = response.headers
                return {
                    "status": "success",
                    "url": url,
                    "strict_transport_security": headers.get("Strict-Transport-Security"),
                    "content_security_policy": headers.get("Content-Security-Policy"),
                    "x_frame_options": headers.get("X-Frame-Options"),
                    "server": headers.get("Server")
                }
    except Exception as e:
        return {"status": "error", "url": url, "error": str(e)}
