"""add_delivery_collected_by_name

Revision ID: 01d65a3f9b2e
Revises: 00c5428c240e
Create Date: 2026-06-23 18:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '01d65a3f9b2e'
down_revision: Union[str, None] = '00c5428c240e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('delivery_records', sa.Column('collected_by_name', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('delivery_records', 'collected_by_name')