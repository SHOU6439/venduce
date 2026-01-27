from datetime import datetime
from ulid import ULID
from sqlalchemy import String, DateTime, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


class User(Base):
    """アプリケーションのユーザーを表すデータモデル。

    Attributes:
        email: ユーザーのメールアドレス（ログイン識別子）。
        username: 表示名とは別の一意のユーザー名。
        password_hash: ハッシュ化済パスワード。
        is_active: アカウントが有効か。
        is_confirmed: メール確認済みか。
        confirmation_token: メール確認用トークン。
        confirmation_sent_at: 確認メール送信日時。
        confirmation_expires_at: 確認トークンの有効期限。
    """
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(26), primary_key=True, index=True, default=lambda: str(ULID()))
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    confirmation_token: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    confirmation_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmation_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


__all__ = ["User"]
