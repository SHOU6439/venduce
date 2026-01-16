from __future__ import annotations

from sqlalchemy import Column, String, DateTime, func, Integer
from ulid import ULID
from app.db.database import Base


class Tag(Base):
    """タグモデル

    Fields:
        id: ULID
        name: タグ名（小文字正規化、ユニーク）
        usage_count: 使用回数（キャッシュ、定期更新または都度更新）
    """
    __tablename__ = "tags"

    id: str = Column(String(26), primary_key=True, default=lambda: str(ULID()), index=True)
    name: str = Column(String(64), nullable=False, unique=True, index=True)
    usage_count: int = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


__all__ = ["Tag"]
