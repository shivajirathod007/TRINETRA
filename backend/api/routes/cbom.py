from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

@router.get("/{scan_id}")
async def get_cbom(scan_id: str):
    # TODO: fetch CBOM data for a specific scan
    return {
        "scan_id": scan_id,
        "cbom": {
            "bomFormat": "CycloneDX",
            "specVersion": "1.5",
            "components": []
        }
    }
