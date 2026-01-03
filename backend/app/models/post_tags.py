from __future__ import annotations

from sqlalchemy import Column, String, ForeignKey
from app.db.database import Base


class PostTag(Base):
    __tablename__ = "post_tags"

    post_id = Column(String(26), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(String(26), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


post_tags = PostTag.__table__

__all__ = ["PostTag", "post_tags"]
