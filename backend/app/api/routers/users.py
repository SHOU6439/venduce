from fastapi import APIRouter, Depends
from app.schemas.user import UserRead
from app.models.user import User
from app.deps import get_current_user

router = APIRouter()

@router.get("/me", response_model=UserRead)
def read_user_me(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    現在のログインユーザーのプロフィール情報を取得します。
    """
    return current_user