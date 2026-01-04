"""merge_heads

Revision ID: 031149f18cd4
Revises: 61427a229aff, 97e23920c6d0
Create Date: 2026-01-04 12:36:19.512757

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '031149f18cd4'
down_revision: Union[str, None] = ('61427a229aff', '97e23920c6d0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
