"""
TRINETRA — Schedule Utilities
Pure functions for computing next run times. No I/O, no Celery dependency.
Importable safely from both the API process and the Celery worker process.
"""

import calendar
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional


def compute_next_run_at(
    frequency: str,
    scheduled_time: time,
    day_of_week: Optional[int],
    day_of_month: Optional[int],
    one_time_date: Optional[date],
    from_dt: Optional[datetime] = None,
) -> datetime:
    """Return the next UTC datetime strictly after *from_dt* for the given schedule."""
    if from_dt is None:
        from_dt = datetime.now(timezone.utc)

    if frequency == "daily":
        return _next_daily(scheduled_time, from_dt)
    elif frequency == "weekly":
        return _next_weekly(scheduled_time, day_of_week, from_dt)
    elif frequency == "monthly":
        return _next_monthly(scheduled_time, day_of_month, from_dt)
    elif frequency == "once":
        return _next_once(scheduled_time, one_time_date, from_dt)
    else:
        raise ValueError(f"Unknown frequency: {frequency!r}")


def _combine_utc(d: date, t: time) -> datetime:
    return datetime(d.year, d.month, d.day, t.hour, t.minute, t.second, t.microsecond, tzinfo=timezone.utc)


def _next_daily(scheduled_time: time, from_dt: datetime) -> datetime:
    candidate = _combine_utc(from_dt.date(), scheduled_time)
    if candidate <= from_dt:
        candidate += timedelta(days=1)
    return candidate


def _next_weekly(scheduled_time: time, day_of_week: int, from_dt: datetime) -> datetime:
    days_ahead = (day_of_week - from_dt.weekday()) % 7
    candidate_date = from_dt.date() + timedelta(days=days_ahead)
    candidate = _combine_utc(candidate_date, scheduled_time)
    if candidate <= from_dt:
        candidate += timedelta(days=7)
    return candidate


def _next_monthly(scheduled_time: time, day_of_month: int, from_dt: datetime) -> datetime:
    day = min(day_of_month, 28)
    candidate = _combine_utc(from_dt.date().replace(day=day), scheduled_time)
    if candidate <= from_dt:
        year = from_dt.year
        month = from_dt.month + 1
        if month > 12:
            month = 1
            year += 1
        max_day = calendar.monthrange(year, month)[1]
        day = min(day, max_day)
        candidate = _combine_utc(date(year, month, day), scheduled_time)
    return candidate


def _next_once(scheduled_time: time, one_time_date: date, from_dt: datetime) -> datetime:
    candidate = _combine_utc(one_time_date, scheduled_time)
    if candidate <= from_dt:
        raise ValueError(
            f"Scheduled datetime {candidate.isoformat()} is not in the future "
            f"(reference time: {from_dt.isoformat()})"
        )
    return candidate
