from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.services.user_service import user_service, UserService
from app.services.asset_service import asset_service, AssetService
from app.utils import jwt as jwt_utils
from app.services.product_service import product_service, ProductService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


def get_user_service() -> UserService:
    """Dependency provider for UserService. Can be overridden in tests."""
    return user_service


def get_asset_service() -> AssetService:
    """Dependency provider for AssetService."""
    return asset_service


def get_product_service() -> ProductService:
    return product_service


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    JWTトークンを検証し、現在のユーザーを取得する依存関係関数
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt_utils.decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return user


def get_admin_user(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin required")
    return current_user
