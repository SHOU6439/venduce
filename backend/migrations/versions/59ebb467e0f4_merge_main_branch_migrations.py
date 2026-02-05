"""Merge main branch migrations

Revision ID: 59ebb467e0f4
Revises: 10ff39eaa6d6, c1d2e3f4a5b6
Create Date: 2026-01-29 23:24:38.050390

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '59ebb467e0f4'
down_revision: Union[str, None] = ('10ff39eaa6d6', 'c1d2e3f4a5b6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
