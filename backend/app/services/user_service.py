import secrets
from datetime import timezone, timedelta, datetime
from typing import Tuple

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.exceptions import (
    AuthenticationError,
    ConfirmationError,
    RefreshTokenError,
    UserAlreadyExists,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.user import UserCreate
from app.utils import jwt as jwt_utils
from app.utils.timezone import now_utc
import secrets


class UserService:

    def update_profile(self, db: Session, user: User, user_update: 'UserUpdate') -> User:
        update_data = user_update.model_dump(exclude_unset=True)
        if update_data:
            for field, value in update_data.items():
                setattr(user, field, value)
            db.add(user)
            try:
                db.commit()
            except Exception as e:
                db.rollback()
                # 必要に応じて独自例外へラップ可
                raise e
            db.refresh(user)
        return user

    def _generate_token(self, length: int = 32) -> str:
        return secrets.token_urlsafe(length)

    def create_provisional_user(self, db: Session, user_in: UserCreate, expires_hours: int = 24) -> tuple[User, str]:
        existing = db.query(User).filter((User.email == user_in.email) | (User.username == user_in.username)).first()
        if existing:
            raise UserAlreadyExists("email or username already exists")

        token = self._generate_token(32)
        now = now_utc()
        expires = now + timedelta(hours=expires_hours)

        user = User(
            email=user_in.email,
            username=user_in.username,
            first_name=user_in.first_name,
            last_name=user_in.last_name,
            password_hash=hash_password(user_in.password),
            created_at=now,
            is_active=False,
            is_confirmed=False,
            confirmation_token=token,
            confirmation_sent_at=now,
            confirmation_expires_at=expires,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user, token

    def confirm_user(self, db: Session, token: str) -> User:
        user = db.query(User).filter(User.confirmation_token == token).first()
        if not user:
            raise ConfirmationError("invalid token")
        now = now_utc()

        def _ensure_aware(dt):
            if dt is None:
                return None
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt

        expires = _ensure_aware(user.confirmation_expires_at)
        if not expires or expires < now:
            raise ConfirmationError("token expired")

        user.is_confirmed = True
        user.is_active = True
        user.confirmation_token = None
        user.confirmation_sent_at = None
        user.confirmation_expires_at = None
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def resend_confirmation(self, db: Session, email: str, expires_hours: int = 24) -> str:
        user = db.query(User).filter(User.email == email).first()
        if not user or user.is_confirmed:
            raise ConfirmationError("user not found or already confirmed")
        token = self._generate_token(32)
        now = now_utc()
        expires = now + timedelta(hours=expires_hours)

        user.confirmation_token = token
        user.confirmation_sent_at = now
        user.confirmation_expires_at = expires
        db.add(user)
        db.commit()
        db.refresh(user)
        return token

    def authenticate_user(self, db: Session, email: str, password: str):
        """Verify user credentials. Returns the user on success, otherwise None.

        Also verifies the user is active.
        """
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if not getattr(user, "is_active", True):
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    def get_user_by_email(self, db: Session, email: str):
        """Return user by email or None."""
        return db.query(User).filter(User.email == email).first()

    def save_refresh_token(self, db: Session, user_id: str, refresh_token: str, expires_at: datetime) -> RefreshToken:
        """
        【DB保存】リフレッシュトークンをデータベースに保存します。
        
        トークン生成は jwt_utils.create_refresh_token() で行い、
        このメソッドはその後の DB 保存処理のみを担当します。
        
        引数:
            db: データベースセッション
            user_id: トークンに関連付けるユーザーID
            refresh_token: JWTリフレッシュトークン文字列
            expires_at: トークン有効期限日時
            
        戻り値:
            データベースに保存されたRefreshTokenモデルインスタンス
        """
        rt = RefreshToken(
            refresh_token=refresh_token,
            user_id=user_id,
            expires_at=expires_at,
            revoked_at=None,
        )
        db.add(rt)
        db.commit()
        db.refresh(rt)
        return rt

    def rotate_refresh_token(
        self, 
        db: Session, 
        refresh_token_str: str,
        create_new_refresh_token_fn,
    ) -> str:
        """
        リフレッシュトークンをローテーションします（古いトークンを無効化し、新しいトークンを生成）。
        
        - 古いトークンを無効化（revoked_at を設定）
        - 新しいトークンを生成して返す
        - トークン盗聴時のリスク軽減
        
        引数:
            db: データベースセッション
            refresh_token_str: クライアントが提供したJWTリフレッシュトークン
            create_new_refresh_token_fn: 新しいリフレッシュトークンを生成する関数
                                        (ttl_days) -> (token_str, expires_at)
        
        戻り値:
            新しいリフレッシュトークン文字列
        
        例外:
            RefreshTokenError: トークンが無効、期限切れ、または見つからない場合
        """
        rt = db.query(RefreshToken).filter(
            RefreshToken.refresh_token == refresh_token_str,
            RefreshToken.revoked_at.is_(None),
        ).first()
        
        if not rt:
            raise RefreshTokenError("refresh token revoked or not found")
        
        now = now_utc()
        if rt.expires_at is None or rt.expires_at < now:
            raise RefreshTokenError("refresh token expired")
        
        # TODO: 今の実装だと、リフレッシュトークンのテーブルが無効となったリフレッシュトークンのレコードで肥大化する可能性がある。
        # 定期的に古い revoked トークンを削除するジョブを追加することを検討する。
        # もしくは、ここで削除しても良いかもしれないが、ログ/監査の観点からは好ましくないかもしれない。
        rt.revoked_at = now
        rt.last_used_at = now
        db.add(rt)

        remaining_days = (rt.expires_at - now).days
        remember_days = (
            settings.REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER
            if remaining_days > settings.REFRESH_TOKEN_EXPIRE_DAYS
            else settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        
        new_refresh_token, new_expires_at = create_new_refresh_token_fn(ttl_days=remember_days)
        self.save_refresh_token(db, rt.user_id, new_refresh_token, new_expires_at)
        
        return new_refresh_token
    
    def logout(self, db: Session, refresh_token_str: str) -> None:
        """
        リフレッシュトークンを無効化してログアウト処理を実行します。
        
        引数:
            db: データベースセッション
            refresh_token_str: 無効化するリフレッシュトークン文字列
        
        例外:
            RefreshTokenError: トークンが見つからない場合
        """
        rt = db.query(RefreshToken).filter(
            RefreshToken.refresh_token == refresh_token_str,
            RefreshToken.revoked_at.is_(None),
        ).first()
        
        if not rt:
            raise RefreshTokenError("refresh token not found or already revoked")
        
        rt.revoked_at = now_utc()
        db.add(rt)
        db.commit()

    def authenticate_and_issue_tokens(
        self,
        db: Session,
        email: str,
        password: str,
        remember: bool = False,
    ) -> Tuple[str, str, int]:
        """ユーザー認証情報を検証し、(access_token, refresh_token, expires_in) を返す。"""
        user = self.get_user_by_email(db, email)
        if not user:
            raise AuthenticationError("invalid_credentials", "Invalid email or password")

        if not getattr(user, "is_confirmed", False):
            raise AuthenticationError(
                "not_confirmed",
                "Account not confirmed. Check your email.",
                status_code=403,
            )

        if not getattr(user, "is_active", True):
            raise AuthenticationError(
                "inactive_account",
                "Account is inactive. Contact support.",
                status_code=403,
            )

        if not verify_password(password, user.password_hash):
            raise AuthenticationError("invalid_credentials", "Invalid email or password")

        access_token, expires_in = jwt_utils.create_access_token(subject=str(user.id))

        remember_days = settings.REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER if remember else None
        refresh_token, expires_at = jwt_utils.create_refresh_token(subject=str(user.id), ttl_days=remember_days)

        self.save_refresh_token(db, str(user.id), refresh_token, expires_at)

        return access_token, refresh_token, expires_in


# default service instance for convenience / backward compatibility
user_service = UserService()
