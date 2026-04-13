"""add http_server_software column

Revision ID: 006
Revises: 005
Create Date: 2026-04-13 09:35:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    # Add http_server_software column to scanned_assets table
    op.add_column('scanned_assets', 
        sa.Column('http_server_software', sa.String(length=256), nullable=True)
    )


def downgrade():
    # Remove http_server_software column
    op.drop_column('scanned_assets', 'http_server_software')
