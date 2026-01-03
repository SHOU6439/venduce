from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.services.user_service import user_service, UserService
from app.services.asset_service import asset_service, AssetService
from app.utils import jwt as jwt_utils
from app.services.product_service import product_service, ProductService
from app.services.post_service import PostService, post_service
from app.services.category_service import category_service, CategoryService
from app.services.brand_service import brand_service, BrandService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)


def get_user_service() -> UserService:
    """Dependency provider for UserService. Can be overridden in tests."""
    return user_service


def get_asset_service() -> AssetService:
    """Dependency provider for AssetService."""
    return asset_service


def get_product_service() -> ProductService:
    return product_service


def get_post_service(db: Session = Depends(get_db)) -> PostService:
    """Dependency provider that constructs a PostService with a DB session."""
    return PostService(db)
  
def get_category_service() -> CategoryService:
    return category_service


def get_brand_service() -> BrandService:
    return brand_service


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


def get_current_user_optional(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> Optional[User]:
    if not token:
        return None

    try:
        payload = jwt_utils.decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except Exception:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    return user


def get_admin_user(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin required")
    return current_user
