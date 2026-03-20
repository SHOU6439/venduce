"""add_category_to_badges

Revision ID: 82c998e132c0
Revises: ddddfb28f5bf
Create Date: 2026-02-28 16:25:23.652158

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '82c998e132c0'
down_revision: Union[str, None] = 'ddddfb28f5bf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # まず enum 型を作成
    badgecategory = sa.Enum(
        'driven_purchases', 'posts', 'likes_received',
        'followers', 'purchases_made', 'first_action',
        name='badgecategory',
    )
    badgecategory.create(op.get_bind(), checkfirst=True)

    # 既存行があるので server_default 付きで nullable にして追加 → 既存行更新 → NOT NULL に
    op.add_column(
        'badges',
        sa.Column(
            'category',
            badgecategory,
            nullable=True,
            server_default='driven_purchases',
        ),
    )
    op.execute("UPDATE badges SET category = 'driven_purchases' WHERE category IS NULL")
    op.alter_column('badges', 'category', nullable=False)
    op.create_index(op.f('ix_badges_category'), 'badges', ['category'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_badges_category'), table_name='badges')
    op.drop_column('badges', 'category')
    sa.Enum(name='badgecategory').drop(op.get_bind(), checkfirst=True)
