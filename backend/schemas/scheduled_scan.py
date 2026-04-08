"""
TRINETRA — Scheduled Scan Pydantic Schemas
Request/response models for scheduled scan endpoints.
"""

from datetime import date, datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


# ─────────────────────────────────────────────────────────────────────────────
# Create / base schema
# ─────────────────────────────────────────────────────────────────────────────

class ScheduledScanCreate(BaseModel):
    domain: str
    frequency: Literal["once", "daily", "weekly", "monthly"]
    scheduled_time: str  # "HH:MM" 24-hour format
    day_of_week: Optional[int] = None   # 0–6, weekly only
    day_of_month: Optional[int] = None  # 1–28, monthly only
    one_time_date: Optional[date] = None  # once only
    scan_scope: Literal["full", "root_only"] = "full"
    crqc_scenario: Literal["pessimistic", "moderate", "optimistic"] = "moderate"

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Domain must not be blank or empty.")
        if " " in v:
            raise ValueError("Domain must not contain spaces.")
        if v.startswith(".") or v.endswith("."):
            raise ValueError("Domain must not have leading or trailing dots.")
        if ".." in v:
            raise ValueError("Domain must not contain consecutive dots.")
        if "." not in v:
            raise ValueError("Domain must contain at least one dot.")
        return v


# ─────────────────────────────────────────────────────────────────────────────
# Response schema
# ─────────────────────────────────────────────────────────────────────────────

class ScheduledScanResponse(ScheduledScanCreate):
    id: UUID
    status: str
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    last_scan_job_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# Patch schema
# ─────────────────────────────────────────────────────────────────────────────

class ScheduledScanPatch(BaseModel):
    status: Literal["active", "paused"]
