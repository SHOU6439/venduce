from __future__ import annotations

from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base


class PostAsset(Base):
    __tablename__ = "post_assets"

    post_id = Column(String(26), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    asset_id = Column(String(26), ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True)
    product_id = Column(String(26), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    asset = relationship("Asset", foreign_keys=[asset_id], overlaps="posts")
    product = relationship("Product", foreign_keys=[product_id])

post_assets = PostAsset.__table__

__all__ = ["PostAsset", "post_assets"]
