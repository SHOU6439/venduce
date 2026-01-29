from __future__ import annotations

from sqlalchemy import Column, String, ForeignKey
from app.db.database import Base


class ProductAsset(Base):
    __tablename__ = "product_assets"

    product_id = Column(String(26), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    asset_id = Column(String(26), ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True)


product_assets = ProductAsset.__table__

__all__ = ["ProductAsset", "product_assets"]
