"""
TRINETRA — Logging Configuration
Structured JSON logging via structlog.
Every log line includes scan_id and asset_url when in scan context.
"""

import logging
import sys
import structlog
from backend.core.config import settings


def configure_logging() -> None:
    """
    Call once at application startup (in api/main.py lifespan).
    Sets up structlog with JSON output for production,
    human-readable colored output for development.
    """
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    if settings.is_production:
        # JSON output — ingested by log aggregators (Splunk, ELK)
        processors = shared_processors + [
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ]
    else:
        # Human-readable colored output for development
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True),
        ]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )

    # Also configure stdlib logging to go through structlog
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )


def get_logger(name: str) -> structlog.BoundLogger:
    """
    Get a named structlog logger.
    Usage:
        log = get_logger(__name__)
        log.info("scan_started", domain="pnb.in", scan_id=str(scan_id))
    """
    return structlog.get_logger(name)
