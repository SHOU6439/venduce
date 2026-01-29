from __future__ import annotations

from ulid import ULID
from sqlalchemy import Column, String, Text, Integer, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.db.database import Base
from app.models.product_category import ProductCategory
from app.models.product_assets import product_assets


class Product(Base):
    """商品を表すモデル

    Fields:
        id: ULID
        title: 商品名
        sku: 在庫管理用SKU（一意）
        description: 商品説明
        price_cents: 価格（最小通貨単位）
        currency: 通貨コード（例: JPY）
        categories: Many-to-many relationship to Category table
        stock_quantity: 在庫数
        status: public/draft
        brand_id: ブランドID
    """

    __tablename__ = "products"

    id = Column(String(26), primary_key=True, index=True, default=lambda: str(ULID()))
    title = Column(String(255), nullable=False)
    sku = Column(String(64), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    price_cents = Column(Integer, nullable=False, default=0)
    currency = Column(String(8), nullable=False, default="JPY")
    stock_quantity = Column(Integer, nullable=False, default=0)
    status = Column(String(32), nullable=False, default="draft", index=True)
    extra_metadata = Column("metadata", JSONB, nullable=True)
    
    brand_id = Column(String(26), ForeignKey("brands.id"), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    brand = relationship("Brand", backref="products")
    categories = relationship("Category", secondary="product_categories", backref="products")
    assets = relationship("Asset", secondary=product_assets, backref="products")


__all__ = ["Product"]
