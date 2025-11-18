from sqlalchemy.orm import Session
from datetime import timezone, timedelta, datetime

from app.core.config import settings
from app.core.security import hash_password, verify_password, pwd_context
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.user import UserCreate
from app.utils.timezone import now_utc
import secrets


class UserAlreadyExists(Exception):
    pass


class ConfirmationError(Exception):
    pass


class UserService:

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

    def create_refresh_token(self, db: Session, user_id: str, refresh_token: str, expires_at: datetime) -> RefreshToken:
        """
        リフレッシュトークンを作成し、データベースに保存します。
        
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


# default service instance for convenience / backward compatibility
user_service = UserService()
