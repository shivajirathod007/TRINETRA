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
        "discovery_tasks.*": {"queue": "discovery"},
        "scan_tasks.*": {"queue": "scans"},
        "analysis_tasks.*": {"queue": "analysis"},
    },
    task_soft_time_limit=120,   # 2 minutes per task
    task_time_limit=180,        # Hard kill after 3 minutes
)
