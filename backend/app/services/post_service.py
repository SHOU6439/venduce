from __future__ import annotations

from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.post import Post
from app.models.asset import Asset
from app.models.product import Product
from app.models.tag import Tag
from app.models.user import User
from app.models.enums import PostStatus
from app.schemas.post import PostCreate
from app.utils.cursor import encode_cursor, decode_cursor


class PostService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_post(self, *, post_in: PostCreate, current_user: User) -> Post:
        """`PostCreate` から `Post` を作成して返します。

        実行内容（ビジネスルール）:
        - `asset_ids` が与えられた場合、アセットが存在し、かつ現在のユーザーの所有であることを検証します。
        - `product_ids` が与えられた場合、該当する製品が存在することを検証します。
        - `tags` はトリム・小文字化して正規化し、既存タグがあれば `usage_count` を増やして再利用、なければ新規作成します。
        - 関連（products/tags/assets）を設定し、DB に保存（commit）、作成した `Post` を返します。

        すべての検証はここに集約され、ルーターは薄く保たれます。
        """
        assets: List[Asset] = []
        if post_in.asset_ids:
            assets = (
                self.db.query(Asset)
                .filter(Asset.id.in_(post_in.asset_ids), Asset.owner_id == current_user.id)
                .all()
            )
            if len(assets) != len(set(post_in.asset_ids)):
                found_ids = {a.id for a in assets}
                missing = set(post_in.asset_ids) - found_ids
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"One or more assets not found or permission denied: {missing}",
                )

        products: List[Product] = []
        if post_in.product_ids:
            products = self.db.query(Product).filter(Product.id.in_(post_in.product_ids)).all()
            if len(products) != len(set(post_in.product_ids)):
                found_ids = {p.id for p in products}
                missing = set(post_in.product_ids) - found_ids
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"One or more products not found: {missing}",
                )

        tags: List[Tag] = []
        if post_in.tags:
            normalized_names = {t.strip().lower() for t in post_in.tags if t.strip()}

            existing_tags = self.db.query(Tag).filter(Tag.name.in_(normalized_names)).all()
            existing_map = {t.name: t for t in existing_tags}

            for name in normalized_names:
                if name in existing_map:
                    tag = existing_map[name]
                    tag.usage_count += 1
                    tags.append(tag)
                else:
                    new_tag = Tag(name=name, usage_count=1)
                    self.db.add(new_tag)
                    tags.append(new_tag)

        post = Post(
            user_id=current_user.id,
            caption=post_in.caption,
            status=post_in.status,
            extra_metadata=post_in.extra_metadata,
        )

        post.products = products
        post.tags = tags
        post.assets = assets

        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)
        return post

    def get_public_posts(
        self,
        *,
        cursor: Optional[str] = None,
        limit: int = 20,
    ) -> Tuple[List[Post], Optional[str], bool]:
        """公開投稿の一覧を cursor ベースのページネーションで取得します。

        Args:
            cursor: 継続取得用のカーソル（Base64 エンコード済み）
            limit: 取得件数（1-100）

        Returns:
            (posts, next_cursor, has_more) のタプル
            - posts: 投稿リスト
            - next_cursor: 次ページのカーソル
            - has_more: 次ページがあるか
        """
        query = (
            self.db.query(Post)
            .filter(Post.status == PostStatus.PUBLIC)
            .order_by(Post.created_at.desc(), Post.id.desc())
        )

        # cursor ベースのページネーション
        if cursor:
            cursor_created_at, cursor_id = decode_cursor(cursor)
            query = query.filter(
                (Post.created_at < cursor_created_at) |
                ((Post.created_at == cursor_created_at) & (Post.id < cursor_id))
            )

        posts = query.limit(limit + 1).all()

        has_more = len(posts) > limit
        if has_more:
            posts = posts[:limit]

        next_cursor = encode_cursor(posts[-1].created_at, posts[-1].id) if posts and has_more else None

        for post in posts:
            _ = post.user
            _ = post.assets
            _ = post.products
            _ = post.tags

        return posts, next_cursor, has_more

    def get_post_by_id(
        self,
        *,
        post_id: str,
        current_user: Optional[User] = None
    ) -> Post:
        """投稿を ID で取得します（公開範囲と権限をチェック）。

        Args:
            post_id: 投稿 ID
            current_user: 現在のユーザー（認証済みの場合）

        Returns:
            Post: 投稿オブジェクト

        Raises:
            HTTPException: 404（投稿が存在しない）、403（アクセス権限がない）
        """
        from sqlalchemy.orm import selectinload

        post = (
            self.db.query(Post)
            .options(
                selectinload(Post.user),
                selectinload(Post.assets),
                selectinload(Post.products),
                selectinload(Post.tags)
            )
            .filter(Post.id == post_id)
            .first()
        )

        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )

        if post.status == PostStatus.PUBLIC:
            return post

        if not current_user or current_user.id != post.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this post"
            )

        return post


def post_service_factory(db: Session) -> PostService:
    return PostService(db)


post_service = None
