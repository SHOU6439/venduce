from __future__ import annotations

from sqlalchemy import Column, String, ForeignKey, Table
from app.db.database import Base

post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id", String(26), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", String(26), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)
