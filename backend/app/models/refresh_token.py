from datetime import timezone
from ulid import ULID
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text
from app.db.database import Base
from app.utils.timezone import now_utc


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String(26), primary_key=True, index=True, default=lambda: str(ULID()))
    user_id = Column(String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    refresh_token = Column(String(1024), unique=True, nullable=False, index=True)
    device_id = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True, index=True)


__all__ = ["RefreshToken"]
