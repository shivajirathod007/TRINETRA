"""Add data_sensitivity_tier columns to scanned_assets

Revision ID: 002
Revises: 001
Create Date: 2026-03-26

Adds three columns to scanned_assets:
  - data_sensitivity_tier        (String(20), default 'static')
  - data_sensitivity_tier_source (String(20), default 'auto_detected')
  - sensitivity_override_reason  (Text, nullable)

Backfills existing rows with safe defaults.
Adds index on data_sensitivity_tier for dashboard filter queries.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add the three new columns
    op.add_column(
        "scanned_assets",
        sa.Column(
            "data_sensitivity_tier",
            sa.String(20),
            nullable=True,
            server_default="static",
        ),
    )
    op.add_column(
        "scanned_assets",
        sa.Column(
            "data_sensitivity_tier_source",
            sa.String(20),
            nullable=True,
            server_default="auto_detected",
        ),
    )
    op.add_column(
        "scanned_assets",
        sa.Column(
            "sensitivity_override_reason",
            sa.Text(),
            nullable=True,
        ),
    )

    # Backfill existing rows — safe defaults
    op.execute(
        "UPDATE scanned_assets "
        "SET data_sensitivity_tier = 'static', "
        "    data_sensitivity_tier_source = 'auto_detected' "
        "WHERE data_sensitivity_tier IS NULL"
    )

    # Index for dashboard filter queries
    op.create_index(
        "ix_scanned_assets_data_sensitivity_tier",
        "scanned_assets",
        ["data_sensitivity_tier"],
    )


def downgrade() -> None:
    op.drop_index("ix_scanned_assets_data_sensitivity_tier", table_name="scanned_assets")
    op.drop_column("scanned_assets", "sensitivity_override_reason")
    op.drop_column("scanned_assets", "data_sensitivity_tier_source")
    op.drop_column("scanned_assets", "data_sensitivity_tier")
