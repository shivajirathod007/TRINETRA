"""
TRINETRA — Celery Application
Task queue for all background scanning work.
"""

from celery import Celery
from core.config import settings

celery_app = Celery(
    "trinetra",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "workers.orchestrator",
        "workers.scheduler",
        "workers.tasks.discovery_tasks",
        "workers.tasks.scan_tasks",
        "workers.tasks.analysis_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "orchestrator.run_full_scan": {"queue": "scans"},
        "scheduler.*": {"queue": "scans"},
        "discovery_tasks.*": {"queue": "discovery"},
        "scan_tasks.*": {"queue": "scans"},
        "analysis_tasks.*": {"queue": "analysis"},
    },
    beat_schedule={
        "check-scheduled-scans": {
            "task": "scheduler.check_scheduled_scans",
            "schedule": 30.0,
        },
    },
    task_soft_time_limit=1800,  # 30 minutes soft limit per task
    task_time_limit=2100,       # 35 minutes hard kill (gives 5 min grace after soft)
)
