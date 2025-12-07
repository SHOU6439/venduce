from __future__ import annotations

from sqlalchemy import Column, String, Text, Integer, BigInteger, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from ulid import ULID

from app.db.database import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String(26), primary_key=True, default=lambda: str(ULID()), nullable=False)

    owner_id = Column(String(26), nullable=False, index=True)
    owner_type = Column(String(32), nullable=False, index=True)
    purpose = Column(String(32), nullable=False, index=True)
    status = Column(String(16), nullable=False, default="pending", index=True)

    storage_key = Column(Text, nullable=False, unique=True)
    content_type = Column(String(100), nullable=False)
    extension = Column(String(10), nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    checksum = Column(String(64), nullable=True, index=True)

    variants = Column(JSONB, nullable=True)
    public_url = Column(Text, nullable=True)
    metadata = Column(JSONB, nullable=True)

    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)


__all__ = ["Asset"]
