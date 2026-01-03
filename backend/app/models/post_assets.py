from __future__ import annotations

from sqlalchemy import Column, String, ForeignKey
from app.db.database import Base


class PostAsset(Base):
    __tablename__ = "post_assets"

    post_id = Column(String(26), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    asset_id = Column(String(26), ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True)

post_assets = PostAsset.__table__

__all__ = ["PostAsset", "post_assets"]
