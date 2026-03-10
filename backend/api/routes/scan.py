from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import uuid

router = APIRouter()

class ScanRequest(BaseModel):
    domain: str

class ScanResponse(BaseModel):
    scan_id: str
    status: str
    message: str

@router.post("/", response_model=ScanResponse)
async def create_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    scan_id = str(uuid.uuid4())
    # TODO: dispatch celery task 
    # scan_tasks.start_domain_scan.delay(scan_id, request.domain)
    return ScanResponse(
        scan_id=scan_id,
        status="pending",
        message=f"Scan initialized for {request.domain}"
    )

@router.get("/{scan_id}")
async def get_scan_status(scan_id: str):
    # TODO: fetch from DB
    return {
        "scan_id": scan_id,
        "status": "in_progress",
        "progress": 45,
        "assets_found": 12
    }
