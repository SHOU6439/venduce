"""add product_assets table for product-asset relationship

Revision ID: c1d2e3f4a5b6
Revises: 16ae3c917486
Create Date: 2026-01-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c1d2e3f4a5b6'
down_revision = '16ae3c917486'


# revision identifiers, used by Alembic.
revision = 'c1d2e3f4a5b6'
down_revision = '16ae3c917486'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create product_assets table
    op.create_table(
        'product_assets',
        sa.Column('product_id', sa.String(26), nullable=False),
        sa.Column('asset_id', sa.String(26), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], name='fk_product_assets_product_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], name='fk_product_assets_asset_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('product_id', 'asset_id')
    )


def downgrade() -> None:
    op.drop_table('product_assets')
