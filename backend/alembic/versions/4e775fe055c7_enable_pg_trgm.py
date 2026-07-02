"""enable_pg_trgm

Revision ID: 4e775fe055c7
Revises: 5e3c5205a716
Create Date: 2026-07-01

"""
from typing import Sequence, Union

from alembic import op

revision: str = '4e775fe055c7'
down_revision: Union[str, None] = '5e3c5205a716'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    op.execute("CREATE INDEX IF NOT EXISTS idx_visitors_name_trgm ON visitors USING gin (name gin_trgm_ops);")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_visitors_name_trgm;")
    op.execute("DROP EXTENSION IF EXISTS pg_trgm;")