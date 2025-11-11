from datetime import timezone
from ulid import ULID
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from app.db.database import Base
from app.utils.timezone import now_utc


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String(26), primary_key=True, index=True, default=lambda: str(ULID()))
    jti = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)


__all__ = ["RefreshToken"]
