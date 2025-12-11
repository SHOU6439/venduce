from __future__ import annotations

from ulid import ULID
from sqlalchemy import Column, String, Text, Integer, Numeric, DateTime, func, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from app.db.database import Base


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

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


__all__ = ["Product"]
