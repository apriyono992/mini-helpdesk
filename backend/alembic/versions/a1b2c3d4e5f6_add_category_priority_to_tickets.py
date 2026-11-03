"""add category and priority to tickets

Revision ID: a1b2c3d4e5f6
Revises: 5936e19ee30f
Create Date: 2026-11-03 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '5936e19ee30f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE ticketpriority AS ENUM ('low', 'medium', 'high')")
    op.add_column('tickets', sa.Column('category', sa.String(length=100), nullable=False, server_default='general'))
    op.add_column('tickets', sa.Column('priority', sa.Enum('low', 'medium', 'high', name='ticketpriority'), nullable=False, server_default='medium'))


def downgrade() -> None:
    op.drop_column('tickets', 'priority')
    op.drop_column('tickets', 'category')
    op.execute("DROP TYPE ticketpriority")
