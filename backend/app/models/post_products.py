from __future__ import annotations

from sqlalchemy import Column, String, ForeignKey, Table
from app.db.database import Base

# 中間テーブル定義
post_products = Table(
    "post_products",
    Base.metadata,
    Column("post_id", String(26), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    Column("product_id", String(26), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
)
