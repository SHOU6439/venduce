from typing import List, Optional
from sqlalchemy import select, delete, func
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models.follow import Follow
from app.models.user import User
from app.models.post import Post
from app.models.enums import PostStatus


class FollowService:
    def __init__(self, db: Session):
        self.db = db

    def follow(self, follower_id: str, following_id: str) -> bool:
        """フォローを作成します。自分自身のフォローは不可。"""
        if follower_id == following_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="自分自身をフォローすることはできません",
            )
        target = self.db.execute(
            select(User).where(User.id == following_id, User.is_active.is_(True))
        ).scalars().first()
        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ユーザーが見つかりません",
            )
        try:
            new_follow = Follow(follower_id=follower_id, following_id=following_id)
            self.db.add(new_follow)
            self.db.commit()
            return True
        except IntegrityError:
            self.db.rollback()
            return False

    def unfollow(self, follower_id: str, following_id: str) -> bool:
        """フォローを解除します（冪等）。"""
        result = self.db.execute(
            delete(Follow).where(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id,
            )
        )
        self.db.commit()
        return result.rowcount > 0

    def is_following(self, follower_id: str, following_id: str) -> bool:
        """フォロー状態を確認します。"""
        row = self.db.execute(
            select(Follow.id).where(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id,
            )
        ).first()
        return row is not None

    def get_follower_count(self, user_id: str) -> int:
        """フォロワー数を返します。"""
        result = self.db.execute(
            select(func.count()).select_from(Follow).where(Follow.following_id == user_id)
        ).scalar()
        return result or 0

    def get_following_count(self, user_id: str) -> int:
        """フォロー中の数を返します。"""
        result = self.db.execute(
            select(func.count()).select_from(Follow).where(Follow.follower_id == user_id)
        ).scalar()
        return result or 0

    def get_followers(
        self, user_id: str, limit: int = 20, cursor: Optional[str] = None
    ) -> tuple[List[User], Optional[str], bool]:
        """指定ユーザーのフォロワー一覧を返します（カーソルページネーション）。"""
        query = (
            self.db.query(User)
            .join(Follow, Follow.follower_id == User.id)
            .filter(Follow.following_id == user_id, User.is_active.is_(True))
            .order_by(Follow.created_at.desc(), Follow.id.desc())
        )
        if cursor:
            follow_row = self.db.execute(
                select(Follow.created_at, Follow.id).where(Follow.id == cursor)
            ).first()
            if follow_row:
                cursor_created_at, cursor_id = follow_row
                query = query.filter(
                    (Follow.created_at < cursor_created_at)
                    | ((Follow.created_at == cursor_created_at) & (Follow.id < cursor_id))
                )
        users = query.limit(limit + 1).all()
        has_more = len(users) > limit
        if has_more:
            users = users[:limit]
        next_cursor: Optional[str] = None
        if users and has_more:
            last_user = users[-1]
            follow_id = self.db.execute(
                select(Follow.id).where(
                    Follow.follower_id == last_user.id,
                    Follow.following_id == user_id,
                )
            ).scalars().first()
            next_cursor = follow_id
        return users, next_cursor, has_more

    def get_following(
        self, user_id: str, limit: int = 20, cursor: Optional[str] = None
    ) -> tuple[List[User], Optional[str], bool]:
        """指定ユーザーがフォロー中のユーザー一覧を返します（カーソルページネーション）。"""
        query = (
            self.db.query(User)
            .join(Follow, Follow.following_id == User.id)
            .filter(Follow.follower_id == user_id, User.is_active.is_(True))
            .order_by(Follow.created_at.desc(), Follow.id.desc())
        )
        if cursor:
            follow_row = self.db.execute(
                select(Follow.created_at, Follow.id).where(Follow.id == cursor)
            ).first()
            if follow_row:
                cursor_created_at, cursor_id = follow_row
                query = query.filter(
                    (Follow.created_at < cursor_created_at)
                    | ((Follow.created_at == cursor_created_at) & (Follow.id < cursor_id))
                )
        users = query.limit(limit + 1).all()
        has_more = len(users) > limit
        if has_more:
            users = users[:limit]
        next_cursor: Optional[str] = None
        if users and has_more:
            last_user = users[-1]
            follow_id = self.db.execute(
                select(Follow.id).where(
                    Follow.follower_id == user_id,
                    Follow.following_id == last_user.id,
                )
            ).scalars().first()
            next_cursor = follow_id
        return users, next_cursor, has_more

    def get_following_feed(
        self, user_id: str, limit: int = 20, cursor: Optional[str] = None
    ) -> tuple[List[Post], Optional[str], bool]:
        """フォロー中ユーザーの公開投稿をタイムライン順で返します。"""
        following_ids = self.db.execute(
            select(Follow.following_id).where(Follow.follower_id == user_id)
        ).scalars().all()
        if not following_ids:
            return [], None, False

        query = (
            self.db.query(Post)
            .filter(
                Post.user_id.in_(following_ids),
                Post.deleted_at.is_(None),
                Post.status == PostStatus.PUBLIC,
            )
            .options(
                selectinload(Post.user),
                selectinload(Post.assets),
                selectinload(Post.products),
                selectinload(Post.tags),
            )
            .order_by(Post.created_at.desc(), Post.id.desc())
        )
        if cursor:
            post_row = self.db.execute(
                select(Post.created_at, Post.id).where(Post.id == cursor)
            ).first()
            if post_row:
                cursor_created_at, cursor_id = post_row
                query = query.filter(
                    (Post.created_at < cursor_created_at)
                    | ((Post.created_at == cursor_created_at) & (Post.id < cursor_id))
                )
        posts = query.limit(limit + 1).all()
        has_more = len(posts) > limit
        if has_more:
            posts = posts[:limit]
        next_cursor: Optional[str] = None
        if posts and has_more:
            next_cursor = posts[-1].id
        return posts, next_cursor, has_more
