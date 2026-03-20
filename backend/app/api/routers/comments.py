from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.schemas.comment import CommentCreate, CommentResponse, CommentUpdate
from app.services.comment_service import CommentService
from app.services.notification_service import NotificationService
from app.deps import get_current_user, get_notification_service
from app.models.user import User
from app.models.post import Post
from app.models.enums import NotificationType

router = APIRouter(redirect_slashes=False)


@router.post("/posts/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    post_id: str,
    comment_in: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """
    投稿にコメントを作成する
    """
    comment = CommentService.create_comment(
        db=db, comment_in=comment_in, post_id=post_id, user_id=current_user.id
    )

    # 投稿主に「コメントされました」通知を送信
    try:
        post = db.query(Post).filter(Post.id == post_id).first()
        if post and post.user_id != current_user.id:
            notification_service.create_notification(
                user_id=post.user_id,
                actor_id=current_user.id,
                notification_type=NotificationType.COMMENT,
                entity_id=post_id,
                message=f"{current_user.username} があなたの投稿にコメントしました",
            )
    except Exception:
        pass

    return comment


@router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
def get_comments(
    post_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    投稿のコメント一覧を取得する (ルートコメントのみ、返信はネストされる)
    """
    return CommentService.get_comments_by_post_id(
        db=db, post_id=post_id, limit=limit, offset=offset
    )


@router.patch("/comments/{comment_id}", response_model=CommentResponse)
def update_comment(
    comment_id: str,
    comment_in: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    コメントを編集する (作成者のみ)
    """
    return CommentService.update_comment(
        db=db, comment_id=comment_id, user_id=current_user.id, content=comment_in.content
    )


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    コメントを削除する (論理削除、作成者のみ)
    子孫コメントもカスケード削除される
    """
    CommentService.delete_comment(
        db=db, comment_id=comment_id, user_id=current_user.id
    )
