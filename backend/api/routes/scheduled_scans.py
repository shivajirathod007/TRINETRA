"""
TRINETRA — Scheduled Scans Router
CRUD endpoints for managing scheduled scan configurations.
"""

import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_current_user
from db.repository import ScheduledScanRepository
from db.session import get_db
from schemas.scheduled_scan import ScheduledScanCreate, ScheduledScanPatch, ScheduledScanResponse
from workers.schedule_utils import compute_next_run_at

router = APIRouter()


def _parse_scheduled_time(time_str: str) -> datetime.time:
    """Parse an "HH:MM" string into a datetime.time. Raises 422 on bad input."""
    try:
        return datetime.time.fromisoformat(time_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid scheduled_time {time_str!r}. Expected HH:MM (24-hour).",
        )


@router.post("/", status_code=201, response_model=ScheduledScanResponse)
async def create_scheduled_scan(
    data: ScheduledScanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
) -> ScheduledScanResponse:
    """Create a new scheduled scan."""
    scheduled_time = _parse_scheduled_time(data.scheduled_time)
    try:
        next_run_at = compute_next_run_at(
            frequency=data.frequency,
            scheduled_time=scheduled_time,
            day_of_week=data.day_of_week,
            day_of_month=data.day_of_month,
            one_time_date=data.one_time_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    repo = ScheduledScanRepository(db)
    record = await repo.create(data, next_run_at)
    await db.commit()
    await db.refresh(record)
    return ScheduledScanResponse.model_validate(record)


@router.get("/", response_model=list[ScheduledScanResponse])
async def list_scheduled_scans(
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
) -> list[ScheduledScanResponse]:
    """List all scheduled scans."""
    repo = ScheduledScanRepository(db)
    records = await repo.list()
    return [ScheduledScanResponse.model_validate(r) for r in records]


@router.get("/{id}", response_model=ScheduledScanResponse)
async def get_scheduled_scan(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
) -> ScheduledScanResponse:
    """Get a single scheduled scan by ID."""
    repo = ScheduledScanRepository(db)
    record = await repo.get(id)
    if record is None:
        raise HTTPException(status_code=404, detail="Scheduled scan not found")
    return ScheduledScanResponse.model_validate(record)


@router.patch("/{id}", response_model=ScheduledScanResponse)
async def patch_scheduled_scan(
    id: uuid.UUID,
    patch: ScheduledScanPatch,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
) -> ScheduledScanResponse:
    """Update the status of a scheduled scan (active / paused)."""
    repo = ScheduledScanRepository(db)
    await repo.update_status(id, patch.status)
    await db.commit()
    record = await repo.get(id)
    if record is None:
        raise HTTPException(status_code=404, detail="Scheduled scan not found")
    return ScheduledScanResponse.model_validate(record)


@router.delete("/{id}", status_code=204)
async def delete_scheduled_scan(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user),
) -> Response:
    """Delete a scheduled scan."""
    repo = ScheduledScanRepository(db)
    deleted = await repo.delete(id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Scheduled scan not found")
    await db.commit()
    return Response(status_code=204)
