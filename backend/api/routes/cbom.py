from fastapi import APIRouter
from typing import Optional

router = APIRouter()


@router.get("/")
async def list_cbom(scan_id: Optional[str] = None, domain: Optional[str] = None):
    """Return CBOM components for a scan or domain."""
    return {
        "domain": domain or "",
        "scan_id": scan_id or "",
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "serialNumber": "",
        "metadata": {
            "timestamp": "",
            "component": {
                "type": "application",
                "name": domain or ""
            }
        },
        "components": [],
        "algorithm_distribution": [],
        "tls_distribution": [],
        "issuer_breakdown": {}
    }


@router.get("/{scan_id}")
async def get_cbom(scan_id: str):
    """Return CBOM for a specific scan."""
    return {
        "scan_id": scan_id,
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "serialNumber": f"urn:uuid:{scan_id}",
        "metadata": {
            "timestamp": "",
            "component": {
                "type": "application",
                "name": ""
            }
        },
        "components": [],
        "algorithm_distribution": [],
        "tls_distribution": [],
        "issuer_breakdown": {}
    }
