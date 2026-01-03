from __future__ import annotations

from sqlalchemy import Column, String, ForeignKey
from app.db.database import Base


class PostProduct(Base):
    __tablename__ = "post_products"

    post_id = Column(String(26), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    product_id = Column(String(26), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)


post_products = PostProduct.__table__

__all__ = ["PostProduct", "post_products"]
