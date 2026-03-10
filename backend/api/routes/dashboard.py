from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("/{domain}")
async def get_dashboard_summary(domain: str):
    # TODO: fetch aggregate metrics for dashboard
    return {
        "domain": domain,
        "exposure_score": 75,
        "total_assets": 150,
        "vulnerable_assets": 45,
        "safe_assets": 105,
        "hndl_urgent_assets": 12,
        "recent_scans": []
    }
