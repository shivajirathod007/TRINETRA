"""
TRINETRA — Scheduled Scan Pydantic Schemas
Request/response models for scheduled scan endpoints.
"""

from datetime import date, datetime, time
from typing import Literal, Optional, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


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

class ScheduledScanResponse(BaseModel):
    id: UUID
    domain: str
    frequency: Literal["once", "daily", "weekly", "monthly"]
    scheduled_time: str  # Will be converted from time to string
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    one_time_date: Optional[date] = None
    scan_scope: Literal["full", "root_only"]
    crqc_scenario: Literal["pessimistic", "moderate", "optimistic"]
    status: str
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    last_scan_job_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
    
    @model_validator(mode='before')
    @classmethod
    def convert_time_to_string(cls, data: Any) -> Any:
        """Convert datetime.time to string before validation"""
        if isinstance(data, dict):
            if 'scheduled_time' in data and isinstance(data['scheduled_time'], time):
                data['scheduled_time'] = data['scheduled_time'].strftime('%H:%M')
        elif hasattr(data, 'scheduled_time') and isinstance(data.scheduled_time, time):
            # Handle SQLAlchemy model objects
            data_dict = {k: getattr(data, k) for k in dir(data) if not k.startswith('_')}
            data_dict['scheduled_time'] = data.scheduled_time.strftime('%H:%M')
            return data_dict
        return data


# ─────────────────────────────────────────────────────────────────────────────
# Patch schema
# ─────────────────────────────────────────────────────────────────────────────

class ScheduledScanPatch(BaseModel):
    status: Literal["active", "paused"]
