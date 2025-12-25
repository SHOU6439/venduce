from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '61427a229aff'
down_revision: Union[str, None] = '7be5e66efce9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('product_categories',
    sa.Column('product_id', sa.String(length=26), nullable=False),
    sa.Column('category_id', sa.String(length=26), nullable=False),
    sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
    sa.PrimaryKeyConstraint('product_id', 'category_id')
    )
    op.add_column('products', sa.Column('brand_id', sa.String(length=26), nullable=True))
    op.create_index(op.f('ix_products_brand_id'), 'products', ['brand_id'], unique=False)
    op.create_foreign_key(None, 'products', 'brands', ['brand_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint(None, 'products', type_='foreignkey')
    op.drop_index(op.f('ix_products_brand_id'), table_name='products')
    op.drop_column('products', 'brand_id')
    op.drop_table('product_categories')