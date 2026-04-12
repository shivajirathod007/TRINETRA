"""
TRINETRA — Database Models
Full ORM schema for scan jobs, discovered assets, and PQC certificates.
"""

import uuid
import datetime as dt
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey,
    Index, Integer, String, Text, Time, func,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ─────────────────────────────────────────────────────────────────────────────
# ScanJob — top-level scan request
# ─────────────────────────────────────────────────────────────────────────────

class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    domain: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # Lifecycle status
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PENDING"
        # Values: PENDING | RUNNING | COMPLETED | FAILED
    )
    celery_task_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Progress tracking
    assets_discovered: Mapped[int] = mapped_column(Integer, default=0)
    assets_scanned: Mapped[int] = mapped_column(Integer, default=0)
    assets_failed: Mapped[int] = mapped_column(Integer, default=0)
    current_stage: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # Stages: ct_mining | dns_resolution | scanning | analysis | complete

    # Aggregated results (filled on completion)
    organization_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    critical_count: Mapped[int] = mapped_column(Integer, default=0)
    high_count: Mapped[int] = mapped_column(Integer, default=0)
    medium_count: Mapped[int] = mapped_column(Integer, default=0)
    low_count: Mapped[int] = mapped_column(Integer, default=0)
    safe_count: Mapped[int] = mapped_column(Integer, default=0)
    shadow_assets_found: Mapped[int] = mapped_column(Integer, default=0)

    # CRQC scenario used for this scan (from settings at scan time)
    crqc_year_used: Mapped[int] = mapped_column(Integer, default=2032)

    # Error info
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    assets: Mapped[list["ScannedAsset"]] = relationship(
        "ScannedAsset", back_populates="scan_job", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ScanJob id={self.id} domain={self.domain} status={self.status}>"


# ─────────────────────────────────────────────────────────────────────────────
# ScannedAsset — one per discovered endpoint
# ─────────────────────────────────────────────────────────────────────────────

class ScannedAsset(Base):
    __tablename__ = "scanned_assets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    scan_job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("scan_jobs.id", ondelete="CASCADE"), index=True
    )

    # ── Identity ──────────────────────────────────────────────────────────────
    fqdn: Mapped[str] = mapped_column(String(512), nullable=False)
    asset_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # Values: web_portal | api_endpoint | vpn_gateway | ssh_endpoint |
    #         mobile_backend | staging | shadow_asset | smtp_mta

    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    port: Mapped[int] = mapped_column(Integer, default=443)
    is_shadow_asset: Mapped[bool] = mapped_column(Boolean, default=False)
    discovery_method: Mapped[str] = mapped_column(
        String(50), default="ct_log_mining"
        # Values: ct_log_mining | dns_brute | direct_input | port_scan
    )

    # ── Scan status ───────────────────────────────────────────────────────────
    scan_status: Mapped[str] = mapped_column(
        String(20), default="PENDING"
        # Values: PENDING | RUNNING | COMPLETED | FAILED | BLOCKED | UNREACHABLE
    )
    scan_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── TLS findings ──────────────────────────────────────────────────────────
    tls_versions_supported: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # e.g. ["TLS_1_2", "TLS_1_3"]
    tls_version_active: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    cipher_suite_active: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    cipher_suites_all: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # e.g. {"TLS_1_2": ["TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384", ...]}
    key_exchange: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # Values: ECDHE | RSA_KEX | DHE | KYBER | ML-KEM-768 | UNKNOWN

    # ── Classical vulnerabilities ─────────────────────────────────────────────
    vulnerabilities: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # e.g. ["ROBOT", "HEARTBLEED"]

    # ── Certificate ───────────────────────────────────────────────────────────
    cert_algorithm: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    cert_key_length: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cert_expiry: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cert_expiry_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cert_issuer: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    cert_subject: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    cert_sha256: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    cert_is_self_signed: Mapped[bool] = mapped_column(Boolean, default=False)
    ocsp_stapling: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    hsts_enabled: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    hsts_max_age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # ── API findings ──────────────────────────────────────────────────────────
    jwt_algorithm: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    auth_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # e.g. "Bearer JWT RS256" | "NTLM" | "Basic" | "API-Key"
    cors_policy: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    http_server_software: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    graphql_introspection: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # ── VPN findings ──────────────────────────────────────────────────────────
    vpn_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # e.g. "cisco_anyconnect" | "fortinet_ssl" | "palo_alto_gp"

    # ── SSH findings ──────────────────────────────────────────────────────────
    ssh_host_key_algorithm: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ssh_kex_methods: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    ssh_server_version: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    # ── AI detections ─────────────────────────────────────────────────────────
    ai_detections: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # List of SingleDetection dicts from AI module
    ai_fallback_used: Mapped[bool] = mapped_column(Boolean, default=False)

    # ── Detection sources ─────────────────────────────────────────────────────
    detection_sources: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # e.g. ["tls_scanner", "cert_analyzer", "ai_classifier"]

    # ── Risk assessment ───────────────────────────────────────────────────────
    quantum_safe_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    # Values: VULNERABLE | PQC_READY | FULLY_QUANTUM_SAFE | UNKNOWN

    quantum_exposure_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    risk_level: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # Values: CRITICAL | HIGH | MEDIUM | LOW | SAFE

    score_breakdown: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # {algorithm_risk: 90, hndl_timeline: 80, public_exposure: 95, weights: {...}}

    hndl_deadline: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # e.g. "Q2 2027"
    hndl_urgency: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # Values: IMMEDIATE | URGENT | PLANNED | MONITOR

    # ── Data sensitivity tier ─────────────────────────────────────────────────
    data_sensitivity_tier: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, default="static"
        # Values: transaction | authentication | static
    )
    data_sensitivity_tier_source: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, default="auto_detected"
        # Values: auto_detected | manual_override
    )
    sensitivity_override_reason: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
        # Free-text reason recorded when an analyst manually overrides the tier
    )

    # ── CBOM ─────────────────────────────────────────────────────────────────
    cbom_entry: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # Full CycloneDX 1.6 JSON entry for this asset

    # ── Migration plan ────────────────────────────────────────────────────────
    migration_plan: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # {steps: [...], estimated_sprints: 2, complexity: "medium"}

    # ── Certificate issued ────────────────────────────────────────────────────
    pqc_certificate_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    scan_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    scan_job: Mapped["ScanJob"] = relationship("ScanJob", back_populates="assets")
    certificate: Mapped[Optional["PQCCertificate"]] = relationship(
        "PQCCertificate",
        primaryjoin="ScannedAsset.pqc_certificate_id == PQCCertificate.id",
        foreign_keys="[ScannedAsset.pqc_certificate_id]",
        uselist=False,
    )

    def __repr__(self) -> str:
        return f"<ScannedAsset fqdn={self.fqdn} type={self.asset_type} score={self.quantum_exposure_score}>"


# ─────────────────────────────────────────────────────────────────────────────
# PQCCertificate — issued per asset after scan
# ─────────────────────────────────────────────────────────────────────────────

class PQCCertificate(Base):
    __tablename__ = "pqc_certificates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Human-readable ID: TRN-2026-0847
    certificate_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    asset_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    scan_job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("scan_jobs.id", ondelete="CASCADE"), index=True
    )

    # Certificate type
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    # Values: QUANTUM_VULNERABLE | PQC_READY | FULLY_QUANTUM_SAFE
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    # Human-readable: "Quantum Vulnerable" | "PQC Ready" | "Fully Quantum Safe"

    # Algorithm details
    key_exchange: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    signature_algorithm: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    nist_standard: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Score
    quantum_exposure_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Validity
    issued_date: Mapped[str] = mapped_column(String(20), nullable=False)
    valid_until: Mapped[str] = mapped_column(String(20), nullable=False)

    # HMAC signature (tamper-evident)
    signature: Mapped[str] = mapped_column(String(64), nullable=False)

    # Full certificate JSON (for export)
    certificate_json: Mapped[dict] = mapped_column(JSON, nullable=False)

    issuing_platform: Mapped[str] = mapped_column(
        String(50), nullable=False, default="TRINETRA v1.0"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<PQCCertificate id={self.certificate_id} status={self.status}>"


# ─────────────────────────────────────────────────────────────────────────────
# CustomScanRule — Manual Rules for Scan Overrides
# ─────────────────────────────────────────────────────────────────────────────

class CustomScanRule(Base):
    __tablename__ = "custom_scan_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    
    match_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # Values: HOSTNAME | CIPHER_SUITE | PROTOCOL
    
    pattern: Mapped[str] = mapped_column(String(255), nullable=False)
    # e.g., "TLS_RSA_*", "*.example.com"
    
    override_status: Mapped[str] = mapped_column(String(50), nullable=False)
    # Values: PQC_READY | VULNERABLE | SAFE | CRITICAL
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<CustomScanRule match={self.match_type} pattern={self.pattern} status={self.override_status}>"


# ─────────────────────────────────────────────────────────────────────────────
# ScheduledScan — recurring / one-time scan schedule
# ─────────────────────────────────────────────────────────────────────────────

class ScheduledScan(Base):
    __tablename__ = "scheduled_scans"

    __table_args__ = (
        Index("ix_scheduled_scans_status_next_run_at", "status", "next_run_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    frequency: Mapped[str] = mapped_column(String(20), nullable=False)
    # Values: daily | weekly | monthly | one_time
    scheduled_time: Mapped[dt.time] = mapped_column(Time, nullable=False)
    day_of_week: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # 0=Monday … 6=Sunday; used when frequency=weekly
    day_of_month: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # 1–31; used when frequency=monthly
    one_time_date: Mapped[Optional[dt.date]] = mapped_column(Date, nullable=True)
    # used when frequency=one_time

    scan_scope: Mapped[str] = mapped_column(String(20), nullable=False)
    crqc_scenario: Mapped[str] = mapped_column(String(20), nullable=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    # Values: active | paused | completed | error

    last_run_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    next_run_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    last_scan_job_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("scan_jobs.id", ondelete="SET NULL"), nullable=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    last_scan_job: Mapped[Optional["ScanJob"]] = relationship(
        "ScanJob",
        foreign_keys=[last_scan_job_id],
        uselist=False,
    )

    def __repr__(self) -> str:
        return f"<ScheduledScan id={self.id} domain={self.domain} frequency={self.frequency} status={self.status}>"
