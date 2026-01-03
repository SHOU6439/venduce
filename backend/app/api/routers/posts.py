from fastapi import APIRouter, Depends, status

from app.deps import get_current_user, get_post_service
from app.models.user import User
from app.schemas.post import PostCreate, PostRead
from app.services.post_service import PostService

router = APIRouter(prefix="/api/posts", tags=["posts"])


@router.post("", response_model=PostRead, status_code=status.HTTP_201_CREATED)
def create_post(
    post_in: PostCreate,
    current_user: User = Depends(get_current_user),
    post_service: PostService = Depends(get_post_service),
):
    """投稿を作成します — バリデーションと永続化は PostService に委譲します。

    アセット／製品の検証、タグの正規化、DB へのコミットなどのビジネスルールは
    `PostService.create_post` に集約されており、ルーターは薄く保たれます。
    """
    post = post_service.create_post(post_in=post_in, current_user=current_user)
    return PostRead.model_validate(post)
