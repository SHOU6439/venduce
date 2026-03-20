from __future__ import annotations

from datetime import datetime
from typing import Optional
from ulid import ULID
from sqlalchemy import String, DateTime, func, Boolean, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db.database import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.asset import Asset


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
        bio: 自己紹介文（最大1000文字、任意）。
        avatar_asset_id: プロフィール画像AssetのID（assets.id, 任意, 1対1リレーション）。
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

    confirmation_token: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    confirmation_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmation_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    bio: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    avatar_asset_id: Mapped[Optional[str]] = mapped_column(String(26), ForeignKey("assets.id"), nullable=True, unique=True)
    avatar_asset: Mapped["Asset"] = relationship("Asset", uselist=False, foreign_keys=[avatar_asset_id])

    is_purchase_history_public: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)


__all__ = ["User"]
