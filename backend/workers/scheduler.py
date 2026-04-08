"""
TRINETRA — Scheduler

This module contains:
  - `compute_next_run_at`: a pure function that computes the next UTC datetime
    at which a scheduled scan should run, given its frequency configuration.
  - `check_scheduled_scans` (added in task 7): a Celery Beat task that polls
    the `scheduled_scans` table every 30 seconds and dispatches `run_full_scan`
    for any due records.
"""

import calendar
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

# Re-export from schedule_utils so existing imports of compute_next_run_at
# from this module (e.g. unit tests) continue to work.
from workers.schedule_utils import (  # noqa: F401
    compute_next_run_at,
    _combine_utc,
    _next_daily,
    _next_weekly,
    _next_monthly,
    _next_once,
)


# ---------------------------------------------------------------------------
# Celery Beat task
# ---------------------------------------------------------------------------

import asyncio
from datetime import datetime, timezone

from workers.celery_app import celery_app
from core.logging import get_logger

log = get_logger(__name__)


@celery_app.task(name="scheduler.check_scheduled_scans")
def check_scheduled_scans() -> dict:
    """
    Celery Beat task — runs every 30 seconds.
    Polls the scheduled_scans table for due active records and dispatches
    run_full_scan for each one.
    """
    return asyncio.run(_dispatch_due_scans())


async def _dispatch_due_scans() -> dict:
    from db.session import AsyncSessionLocal
    from db.repository import ScheduledScanRepository, ScanRepository
    from workers.tasks.scan_tasks import run_full_scan  # noqa: F401 — imported for .delay()

    dispatched = 0
    failed = 0

    async with AsyncSessionLocal() as db:
        due_records = await ScheduledScanRepository(db).get_due()

        for record in due_records:
            try:
                # Create a new ScanJob so we have an ID to pass to run_full_scan
                scan_job = await ScanRepository(db).create_scan(record.domain)
                await db.commit()

                # Dispatch the scan task
                from workers.orchestrator import run_full_scan as _run_full_scan
                _run_full_scan.delay(str(scan_job.id), record.domain, record.scan_scope)

                # Compute next_run_at (None for once — it becomes completed)
                if record.frequency == "once":
                    new_next_run_at = None
                    new_status = "completed"
                else:
                    new_next_run_at = compute_next_run_at(
                        frequency=record.frequency,
                        scheduled_time=record.scheduled_time,
                        day_of_week=record.day_of_week,
                        day_of_month=record.day_of_month,
                        one_time_date=record.one_time_date,
                    )
                    new_status = "active"

                await ScheduledScanRepository(db).update_after_run(
                    id=record.id,
                    last_run_at=datetime.now(timezone.utc),
                    next_run_at=new_next_run_at,
                    last_scan_job_id=scan_job.id,
                    new_status=new_status,
                )
                await db.commit()

                log.info(
                    "scheduled_scan_dispatched",
                    scheduled_scan_id=str(record.id),
                    scan_job_id=str(scan_job.id),
                    domain=record.domain,
                    frequency=record.frequency,
                    new_status=new_status,
                )
                dispatched += 1

            except Exception as exc:
                log.error(
                    "scheduled_scan_dispatch_failed",
                    scheduled_scan_id=str(record.id),
                    domain=record.domain,
                    error=str(exc),
                    exc_info=True,
                )
                try:
                    await ScheduledScanRepository(db).update_status(record.id, "failed")
                    await db.commit()
                except Exception as inner_exc:
                    log.error(
                        "scheduled_scan_status_update_failed",
                        scheduled_scan_id=str(record.id),
                        error=str(inner_exc),
                    )
                failed += 1

    log.info("check_scheduled_scans_complete", dispatched=dispatched, failed=failed)
    return {"dispatched": dispatched, "failed": failed}
