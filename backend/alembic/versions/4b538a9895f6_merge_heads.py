"""merge_heads

Revision ID: 4b538a9895f6
Revises: 01d65a3f9b2e, 4e775fe055c7
Create Date: 2026-07-01 15:43:23.249631

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '4b538a9895f6'
down_revision: Union[str, None] = ('01d65a3f9b2e', '4e775fe055c7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
