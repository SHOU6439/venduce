from sqlalchemy import select, delete, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models.like import Like
from app.models.post import Post


class LikeService:
    def __init__(self, db: Session):
        self.db = db

    def create_like(self, user_id: str, post_id: str) -> bool:
        """いいねを作成し、投稿のいいね数を加算します。

        Returns:
            bool: 新規作成された場合はTrue、既に存在していた場合はFalse
        """
        post = self.db.execute(select(Post).where(Post.id == post_id)).scalars().first()
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )

        try:
            new_like = Like(user_id=user_id, post_id=post_id)
            self.db.add(new_like)

            self.db.execute(
                update(Post)
                .where(Post.id == post_id)
                .values(like_count=Post.like_count + 1)
            )

            self.db.commit()
            return True
        except IntegrityError:
            self.db.rollback()
            return False

    def delete_like(self, user_id: str, post_id: str) -> None:
        """いいねを削除し、投稿のいいね数を減算します。

        いいねが存在しない場合は何もしません（冪等性）。
        """
        post = self.db.execute(select(Post).where(Post.id == post_id)).scalars().first()
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )

        result = self.db.execute(
            delete(Like).where(
                Like.user_id == user_id,
                Like.post_id == post_id
            )
        )

        if result.rowcount > 0:
            self.db.execute(
                update(Post)
                .where(Post.id == post_id)
                .values(like_count=Post.like_count - 1)
            )
            self.db.commit()

