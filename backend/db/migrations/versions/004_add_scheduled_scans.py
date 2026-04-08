"""Add scheduled_scans table

Revision ID: 004
Revises: 003
Create Date: 2026-04-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "scheduled_scans",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("domain", sa.String(255), nullable=False),
        sa.Column("frequency", sa.String(20), nullable=False),
        sa.Column("scheduled_time", sa.Time(), nullable=False),
        sa.Column("day_of_week", sa.SmallInteger(), nullable=True),
        sa.Column("day_of_month", sa.SmallInteger(), nullable=True),
        sa.Column("one_time_date", sa.Date(), nullable=True),
        sa.Column("scan_scope", sa.String(20), nullable=False),
        sa.Column("crqc_scenario", sa.String(20), nullable=False),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "last_scan_job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("scan_jobs.id"),
            nullable=True,
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_scheduled_scans_status_next_run_at",
        "scheduled_scans",
        ["status", "next_run_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_scheduled_scans_status_next_run_at", table_name="scheduled_scans")
    op.drop_table("scheduled_scans")
