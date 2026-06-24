"""add_delivery_collected_by

Revision ID: 00c5428c240e
Revises: 5707d9fae95f
Create Date: 2026-06-23 17:35:19.885691

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '00c5428c240e'
down_revision: Union[str, None] = '5707d9fae95f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('delivery_records', sa.Column('collected_by', sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column('delivery_records', 'collected_by')