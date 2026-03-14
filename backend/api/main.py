from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings

from api.routes import scan, dashboard, cbom, certificate, assets

app = FastAPI(
    title="TRINETRA API",
    description="Quantum Exposure Intelligence Platform API",
    version="1.0.0"
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

# Include routers
app.include_router(scan.router,        prefix="/api/v1/scans",        tags=["Scans"])
app.include_router(dashboard.router,   prefix="/api/v1/dashboard",    tags=["Dashboard"])
app.include_router(assets.router,      prefix="/api/v1/assets",       tags=["Assets"])
app.include_router(cbom.router,        prefix="/api/v1/cbom",         tags=["CBOM"])
app.include_router(certificate.router, prefix="/api/v1/certificates", tags=["Certificates"])
