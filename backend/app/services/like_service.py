from typing import List
from sqlalchemy import select, delete, update
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models.like import Like
from app.models.post import Post
from app.models.enums import PostStatus


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

    def get_liked_post_ids_for_user(self, user_id: str, post_ids: list[str]) -> set[str]:
        """指定ユーザーが既にいいねしている投稿IDをセットで返します（バッチ取得）。

        Args:
            user_id: ユーザー ID
            post_ids: チェック対象の投稿 ID リスト

        Returns:
            set[str]: ユーザーがいいね済みの投稿 ID セット
        """
        if not post_ids:
            return set()
        result = self.db.execute(
            select(Like.post_id).where(
                Like.user_id == user_id,
                Like.post_id.in_(post_ids)
            )
        ).scalars().all()
        return set(result)

    def get_liked_posts_by_user(self, user_id: str, limit: int = 20, cursor: str | None = None) -> tuple[List[Post], str | None, bool]:
        """ユーザーがいいねした投稿一覧を新しい順で返します（カーソルページネーション）。

        Args:
            user_id: ユーザー ID
            limit: 取得件数
            cursor: 継続取得用 Like.id（降順）

        Returns:
            (posts, next_cursor, has_more) のタプル
        """
        query = (
            self.db.query(Post)
            .join(Like, Like.post_id == Post.id)
            .filter(Like.user_id == user_id)
            .filter(Post.deleted_at.is_(None))
            .options(
                selectinload(Post.user),
                selectinload(Post.assets),
                selectinload(Post.products),
                selectinload(Post.tags),
            )
            .order_by(Like.created_at.desc(), Like.id.desc())
        )

        if cursor:
            like_row = self.db.execute(
                select(Like.created_at, Like.id).where(Like.id == cursor, Like.user_id == user_id)
            ).first()
            if like_row:
                cursor_created_at, cursor_id = like_row
                query = query.filter(
                    (Like.created_at < cursor_created_at) |
                    ((Like.created_at == cursor_created_at) & (Like.id < cursor_id))
                )

        posts = query.limit(limit + 1).all()
        has_more = len(posts) > limit
        if has_more:
            posts = posts[:limit]

        next_cursor: str | None = None
        if posts and has_more:
            last_post = posts[-1]
            like_id_row = self.db.execute(
                select(Like.id).where(Like.user_id == user_id, Like.post_id == last_post.id)
            ).scalars().first()
            next_cursor = like_id_row

        return posts, next_cursor, has_more

