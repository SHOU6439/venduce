from __future__ import annotations

from sqlalchemy import Column, String, ForeignKey, Table
from app.db.database import Base


post_assets = Table(
    "post_assets",
    Base.metadata,
    Column("post_id", String(26), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    Column("asset_id", String(26), ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True),
)
