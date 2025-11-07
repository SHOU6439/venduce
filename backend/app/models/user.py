from sqlalchemy import Column, Integer, String, DateTime, func, Boolean
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    username = Column(String(32), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    password_hash = Column(String(256), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)
    is_confirmed = Column(Boolean, default=False, nullable=False)
    confirmation_token = Column(String(128), nullable=True, index=True)
    confirmation_sent_at = Column(DateTime(timezone=True), nullable=True)
    confirmation_expires_at = Column(DateTime(timezone=True), nullable=True)


__all__ = ["User"]
