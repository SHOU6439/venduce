"""Merge remaining heads

Revision ID: 36854508d5d3
Revises: 59ebb467e0f4, cc7e3a21cf27
Create Date: 2026-02-10 06:00:16.881921

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '36854508d5d3'
down_revision: Union[str, None] = ('59ebb467e0f4', 'cc7e3a21cf27')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
