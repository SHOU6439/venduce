from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.user import UserRead, UserUpdate
from app.schemas.asset import AssetRead
from app.models.user import User
from app.db.database import get_db
from app.deps import get_current_user, get_user_service

router = APIRouter()

@router.get("/me", response_model=UserRead)
def read_user_me(
    current_user: User = Depends(get_current_user),
) -> UserRead:
    """
    現在のログインユーザーのプロフィール情報を取得します。
    """
    user_dict = current_user.__dict__.copy()
    if hasattr(current_user, "avatar_asset") and current_user.avatar_asset:
        user_dict["avatar_asset"] = AssetRead.model_validate(current_user.avatar_asset)
    else:
        user_dict["avatar_asset"] = None
    return UserRead.model_validate(user_dict)


@router.patch("/me", response_model=UserRead)
def update_user_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    user_service = Depends(get_user_service),
) -> UserRead:
    """
    現在のログインユーザーのプロフィール情報を更新します。
    """
    updated = user_service.update_profile(db, current_user, user_update)
    user_dict = updated.__dict__.copy()
    if hasattr(updated, "avatar_asset") and updated.avatar_asset:
        user_dict["avatar_asset"] = AssetRead.model_validate(updated.avatar_asset)
    else:
        user_dict["avatar_asset"] = None
    return UserRead.model_validate(user_dict)
