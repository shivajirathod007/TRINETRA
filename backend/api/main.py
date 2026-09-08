import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.logging import get_logger
from engine.ai.llm_fallback import log_llm_fallback_config

from api.routes import scan, dashboard, cbom, certificate, assets, chat, auth, rules, scheduled_scans, reports

log = get_logger(__name__)


def _warm_up_ai_classifier() -> None:
    """
    Load the DistilBERT classifier and run one throwaway prediction so the
    ~67MB model is resident before the first real request, instead of adding
    its load time to whichever user happens to arrive first.
    """
    from engine.ai.classifier import MODEL_DIR, AIClassifier

    classifier = AIClassifier()
    classifier.predict("warm-up: TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384")
    log.info(
        "ai_classifier_warmed_up",
        model_loaded=classifier.is_loaded,
        model_dir=settings.ai_model_dir,
        path=MODEL_DIR,
        labels=list(classifier.id2label.values()) if classifier.is_loaded else [],
    )
    if not classifier.is_loaded:
        log.warning(
            "ai_classifier_not_loaded",
            model_dir=settings.ai_model_dir,
            detail="regex pre-pass only; DistilBERT inference is unavailable",
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run migrations on startup in development so DB is ready."""
    if not settings.is_production:
        try:
            import os
            import subprocess
            backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
            subprocess.run(
                ["alembic", "upgrade", "head"],
                cwd=backend_dir,
                env={**os.environ},
                capture_output=True,
                timeout=60,
                check=False,
            )
        except Exception:
            pass  # DB may be down; routes will return 503 or []

    # Log the LLM fallback configuration early so misconfigurations are visible
    try:
        log_llm_fallback_config()
    except Exception as e:
        log.warning("llm_fallback_config_log_failed", error=str(e))

    # Warm up DistilBERT off the event loop so startup is not blocked
    try:
        await asyncio.to_thread(_warm_up_ai_classifier)
    except Exception as e:
        log.warning("ai_classifier_warmup_failed", error=str(e))

    # Register JARSH's Ollama keep-alive here: __init__ runs at import time,
    # where there is no event loop to schedule it on.
    try:
        asyncio.create_task(chat.jarsh_service._keep_model_alive())
    except Exception as e:
        log.warning("jarsh_keep_alive_registration_failed", error=str(e))

    yield


app = FastAPI(
    title="TRINETRA API",
    description="Quantum Exposure Intelligence Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root/Health check
@app.get("/")
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "trinetra-api"}


# Queue health — so you can verify Redis (and thus Celery) can be reached
@app.get("/api/v1/health/queue")
async def health_queue():
    """Check Redis connectivity. Scans stay 'Queued' if Redis is down or the Celery worker is not running."""
    try:
        import redis
        from core.config import settings
        r = redis.from_url(settings.redis_url)
        r.ping()
        return {"status": "ok", "redis": "connected", "message": "Queue is reachable. Ensure Celery worker is running: celery -A workers.celery_app worker -Q scans,discovery,analysis --loglevel=info"}
    except Exception as e:
        return {"status": "degraded", "redis": "disconnected", "error": str(e), "message": "Start Redis and the Celery worker so scans can run."}

# Include routers
app.include_router(auth.router,        prefix="/api/v1/auth",         tags=["Auth"])
app.include_router(scan.router,        prefix="/api/v1/scans",        tags=["Scans"])
app.include_router(dashboard.router,   prefix="/api/v1/dashboard",    tags=["Dashboard"])
app.include_router(assets.router,      prefix="/api/v1/assets",       tags=["Assets"])
app.include_router(cbom.router,        prefix="/api/v1/cbom",         tags=["CBOM"])
app.include_router(certificate.router, prefix="/api/v1/certificates", tags=["Certificates"])
app.include_router(rules.router,       prefix="/api/v1/rules",        tags=["Rules"])
app.include_router(chat.router,            prefix="/api/v1/chat",              tags=["Chat"])
app.include_router(scheduled_scans.router, prefix="/api/v1/scheduled-scans",   tags=["Scheduled Scans"])
app.include_router(reports.router,         prefix="/api/v1",                   tags=["Reports"])
