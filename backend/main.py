from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import scan, cbom, certificate, dashboard

app = FastAPI(
    title="TRINETRA Quantum Exposure Intelligence API",
    description="API for scanning public-facing bank infrastructure for quantum cryptographic vulnerabilities.",
    version="1.0.0"
)

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(scan.router, prefix="/scan", tags=["Scanning"])
app.include_router(cbom.router, prefix="/cbom", tags=["CBOM"])
app.include_router(certificate.router, prefix="/certificate", tags=["Certificates"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}
