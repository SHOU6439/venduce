from ulid import ULID
from sqlalchemy import Column, String, DateTime, func, Boolean, ForeignKey
from sqlalchemy.orm import relationship
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
        bio: 自己紹介文（最大1000文字、任意）。
        avatar_asset_id: プロフィール画像AssetのID（assets.id, 任意, 1対1リレーション）。
    """
    __tablename__ = "users"

    id = Column(String(26), primary_key=True, index=True, default=lambda: str(ULID()))
    email = Column(String(100), unique=True, nullable=False, index=True)
    username = Column(String(32), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    password_hash = Column(String(256), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    is_active = Column(Boolean, default=False, nullable=False)
    is_confirmed = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    confirmation_token = Column(String(128), nullable=True, index=True)
    confirmation_sent_at = Column(DateTime(timezone=True), nullable=True)
    confirmation_expires_at = Column(DateTime(timezone=True), nullable=True)

    bio = Column(String(1000), nullable=True)
    avatar_asset_id = Column(String(26), ForeignKey("assets.id"), nullable=True, unique=True)
    avatar_asset = relationship("Asset", uselist=False, foreign_keys=[avatar_asset_id])


__all__ = ["User"]
