"""Add CustomScanRule model

Revision ID: 003
Revises: 002
Create Date: 2026-04-05

"""

from typing import Sequence, Union
import uuid

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "custom_scan_rules",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("match_type", sa.String(length=50), nullable=False),
        sa.Column("pattern", sa.String(length=255), nullable=False),
        sa.Column("override_status", sa.String(length=50), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    )


def downgrade() -> None:
    op.drop_table("custom_scan_rules")
