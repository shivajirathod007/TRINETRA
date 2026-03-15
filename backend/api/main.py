from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings

from api.routes import scan, dashboard, cbom, certificate, assets


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
app.include_router(scan.router,        prefix="/api/v1/scans",        tags=["Scans"])
app.include_router(dashboard.router,   prefix="/api/v1/dashboard",    tags=["Dashboard"])
app.include_router(assets.router,      prefix="/api/v1/assets",       tags=["Assets"])
app.include_router(cbom.router,        prefix="/api/v1/cbom",         tags=["CBOM"])
app.include_router(certificate.router, prefix="/api/v1/certificates", tags=["Certificates"])
