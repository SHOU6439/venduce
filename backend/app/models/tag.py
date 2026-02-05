from __future__ import annotations

from datetime import datetime
from sqlalchemy import String, DateTime, func, Integer
from sqlalchemy.orm import Mapped, mapped_column
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

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=lambda: str(ULID()), index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    usage_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


__all__ = ["Tag"]
