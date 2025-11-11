"""users: id -> ulid

Revision ID: 91432243e31e
Revises: 7fe37befb737
Create Date: 2025-11-07 04:33:36.375332

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from ulid import ULID

# revision identifiers, used by Alembic.
revision: str = '91432243e31e'
down_revision: Union[str, None] = '7fe37befb737'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # NOTE: the autogenerate originally produced a DROP TABLE which is destructive.
    # Replace that with a safe, non-destructive migration that adds a new ULID
    # column, populates it with generated ULIDs, and prepares indexes. The
    # actual primary-key swap / column rename should be done in a follow-up
    # migration after the application has been updated to handle the new id.

    # 1. add a new nullable column to hold the ULID strings
    op.add_column('users', sa.Column('id_ulid', sa.String(length=26), nullable=True))

    # 2. populate id_ulid for existing rows using python-ulid
    bind = op.get_bind()
    res = bind.execute(sa.text("SELECT id FROM users"))
    rows = [r[0] for r in res]
    for old_id in rows:
        new_ulid = str(ULID())
        bind.execute(sa.text("UPDATE users SET id_ulid = :new WHERE id = :old"), {"new": new_ulid, "old": old_id})

    # 3. make id_ulid non-nullable and add a unique index for easy lookup
    op.alter_column('users', 'id_ulid', nullable=False)
    op.create_index('ix_users_id_ulid', 'users', ['id_ulid'], unique=True)


def downgrade() -> None:
    # Reverse the safe upgrade: drop the added ULID column/index.
    op.drop_index('ix_users_id_ulid', table_name='users')
    op.drop_column('users', 'id_ulid')
