from __future__ import annotations

from ulid import ULID
from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from typing import TYPE_CHECKING

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.brand import Brand
    from app.models.category import Category


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

    id: Mapped[str] = mapped_column(String(26), primary_key=True, index=True, default=lambda: str(ULID()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="JPY")
    stock_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft", index=True)
    extra_metadata: Mapped[dict | list | None] = mapped_column("metadata", JSONB, nullable=True)

    brand_id: Mapped[str | None] = mapped_column(String(26), ForeignKey("brands.id"), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    brand: Mapped["Brand"] = relationship("Brand", backref="products")
    categories: Mapped[list["Category"]] = relationship("Category", secondary="product_categories", backref="products")


__all__ = ["Product"]
