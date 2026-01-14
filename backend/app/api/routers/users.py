from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.user import UserRead, UserUpdate
from app.models.user import User
from app.db.database import get_db
from app.deps import get_current_user

router = APIRouter()

@router.get("/me", response_model=UserRead)
def read_user_me(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    現在のログインユーザーのプロフィール情報を取得します。
    """
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead)
def update_user_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """
    現在のログインユーザーのプロフィール情報を更新します。
    """
    update_data = user_update.model_dump(exclude_unset=True)

    if update_data:
        for field, value in update_data.items():
            setattr(current_user, field, value)
        
        db.add(current_user)
        db.commit()
        db.refresh(current_user)

    return UserRead.model_validate(current_user)
