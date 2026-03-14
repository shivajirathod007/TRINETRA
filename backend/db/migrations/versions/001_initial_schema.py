"""Initial schema — ScanJob, ScannedAsset, PQCCertificate

Revision ID: 001
Revises: 
Create Date: 2026-03-14
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── scan_jobs ─────────────────────────────────────────────────────────────
    op.create_table(
        "scan_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("domain", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("celery_task_id", sa.String(255), nullable=True),
        sa.Column("assets_discovered", sa.Integer(), server_default="0"),
        sa.Column("assets_scanned", sa.Integer(), server_default="0"),
        sa.Column("assets_failed", sa.Integer(), server_default="0"),
        sa.Column("current_stage", sa.String(100), nullable=True),
        sa.Column("organization_score", sa.Float(), nullable=True),
        sa.Column("critical_count", sa.Integer(), server_default="0"),
        sa.Column("high_count", sa.Integer(), server_default="0"),
        sa.Column("medium_count", sa.Integer(), server_default="0"),
        sa.Column("low_count", sa.Integer(), server_default="0"),
        sa.Column("safe_count", sa.Integer(), server_default="0"),
        sa.Column("shadow_assets_found", sa.Integer(), server_default="0"),
        sa.Column("crqc_year_used", sa.Integer(), server_default="2032"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_scan_jobs_domain", "scan_jobs", ["domain"])
    op.create_index("ix_scan_jobs_status", "scan_jobs", ["status"])

    # ── scanned_assets ────────────────────────────────────────────────────────
    op.create_table(
        "scanned_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("scan_job_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("scan_jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fqdn", sa.String(512), nullable=False),
        sa.Column("asset_url", sa.String(1024), nullable=False),
        sa.Column("asset_type", sa.String(50), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("port", sa.Integer(), server_default="443"),
        sa.Column("is_shadow_asset", sa.Boolean(), server_default="false"),
        sa.Column("discovery_method", sa.String(50), server_default="ct_log_mining"),
        sa.Column("scan_status", sa.String(20), server_default="PENDING"),
        sa.Column("scan_error", sa.Text(), nullable=True),
        # TLS
        sa.Column("tls_versions_supported", postgresql.JSON(), nullable=True),
        sa.Column("tls_version_active", sa.String(20), nullable=True),
        sa.Column("cipher_suite_active", sa.String(256), nullable=True),
        sa.Column("cipher_suites_all", postgresql.JSON(), nullable=True),
        sa.Column("key_exchange", sa.String(50), nullable=True),
        sa.Column("vulnerabilities", postgresql.JSON(), nullable=True),
        # Certificate
        sa.Column("cert_algorithm", sa.String(100), nullable=True),
        sa.Column("cert_key_length", sa.Integer(), nullable=True),
        sa.Column("cert_expiry", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cert_expiry_days", sa.Integer(), nullable=True),
        sa.Column("cert_issuer", sa.String(512), nullable=True),
        sa.Column("cert_subject", sa.String(512), nullable=True),
        sa.Column("cert_sha256", sa.String(64), nullable=True),
        sa.Column("cert_is_self_signed", sa.Boolean(), server_default="false"),
        sa.Column("ocsp_stapling", sa.Boolean(), nullable=True),
        sa.Column("hsts_enabled", sa.Boolean(), nullable=True),
        sa.Column("hsts_max_age", sa.Integer(), nullable=True),
        # API
        sa.Column("jwt_algorithm", sa.String(50), nullable=True),
        sa.Column("auth_type", sa.String(100), nullable=True),
        sa.Column("cors_policy", sa.String(50), nullable=True),
        sa.Column("graphql_introspection", sa.Boolean(), nullable=True),
        # VPN
        sa.Column("vpn_type", sa.String(100), nullable=True),
        # SSH
        sa.Column("ssh_host_key_algorithm", sa.String(100), nullable=True),
        sa.Column("ssh_kex_methods", postgresql.JSON(), nullable=True),
        sa.Column("ssh_server_version", sa.String(256), nullable=True),
        # AI
        sa.Column("ai_detections", postgresql.JSON(), nullable=True),
        sa.Column("ai_fallback_used", sa.Boolean(), server_default="false"),
        sa.Column("detection_sources", postgresql.JSON(), nullable=True),
        # Risk
        sa.Column("quantum_safe_status", sa.String(30), nullable=True),
        sa.Column("quantum_exposure_score", sa.Float(), nullable=True),
        sa.Column("risk_level", sa.String(20), nullable=True),
        sa.Column("score_breakdown", postgresql.JSON(), nullable=True),
        sa.Column("hndl_deadline", sa.String(20), nullable=True),
        sa.Column("hndl_urgency", sa.String(20), nullable=True),
        # CBOM
        sa.Column("cbom_entry", postgresql.JSON(), nullable=True),
        sa.Column("migration_plan", postgresql.JSON(), nullable=True),
        sa.Column("pqc_certificate_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("scan_timestamp", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_scanned_assets_scan_job_id", "scanned_assets", ["scan_job_id"])
    op.create_index("ix_scanned_assets_fqdn", "scanned_assets", ["fqdn"])
    op.create_index("ix_scanned_assets_risk_level", "scanned_assets", ["risk_level"])

    # ── pqc_certificates ──────────────────────────────────────────────────────
    op.create_table(
        "pqc_certificates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("certificate_id", sa.String(50), nullable=False, unique=True),
        sa.Column("asset_url", sa.String(1024), nullable=False),
        sa.Column("scan_job_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("scan_jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("label", sa.String(50), nullable=False),
        sa.Column("key_exchange", sa.String(100), nullable=True),
        sa.Column("signature_algorithm", sa.String(100), nullable=True),
        sa.Column("nist_standard", sa.String(100), nullable=True),
        sa.Column("quantum_exposure_score", sa.Float(), nullable=True),
        sa.Column("issued_date", sa.String(20), nullable=False),
        sa.Column("valid_until", sa.String(20), nullable=False),
        sa.Column("signature", sa.String(64), nullable=False),
        sa.Column("certificate_json", postgresql.JSON(), nullable=False),
        sa.Column("issuing_platform", sa.String(50), server_default="TRINETRA v1.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_pqc_certificates_scan_job_id", "pqc_certificates", ["scan_job_id"])


def downgrade() -> None:
    op.drop_table("pqc_certificates")
    op.drop_table("scanned_assets")
    op.drop_table("scan_jobs")
