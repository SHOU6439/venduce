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
from app.schemas.post import PostCreate, PostUpdate
from app.utils.cursor import encode_cursor, decode_cursor


class PostService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _validate_and_fetch_assets(self, asset_ids: List[str], current_user: User) -> List[Asset]:
        if not asset_ids:
            return []

        assets = (
            self.db.query(Asset)
            .filter(Asset.id.in_(asset_ids), Asset.owner_id == current_user.id)
            .all()
        )

        if len(assets) != len(set(asset_ids)):
            found_ids = {a.id for a in assets}
            missing = set(asset_ids) - found_ids
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"One or more assets not found or permission denied: {missing}",
            )
        return assets

    def _validate_and_fetch_products(self, product_ids: List[str]) -> List[Product]:
        if not product_ids:
            return []

        products = self.db.query(Product).filter(Product.id.in_(product_ids)).all()

        if len(products) != len(set(product_ids)):
            found_ids = {p.id for p in products}
            missing = set(product_ids) - found_ids
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"One or more products not found: {missing}",
            )
        return products

    def _get_or_create_tags(self, tag_names: List[str]) -> List[Tag]:
        if not tag_names:
            return []

        normalized_names = {t.strip().lower() for t in tag_names if t.strip()}
        if not normalized_names:
            return []

        existing_tags = self.db.query(Tag).filter(Tag.name.in_(normalized_names)).all()
        existing_map = {t.name: t for t in existing_tags}

        tags = []
        for name in normalized_names:
            if name in existing_map:
                tags.append(existing_map[name])
            else:
                new_tag = Tag(name=name, usage_count=0)
                self.db.add(new_tag)
                tags.append(new_tag)
        return tags

    def create_post(self, *, post_in: PostCreate, current_user: User) -> Post:
        """`PostCreate` から `Post` を作成して返します。

        実行内容（ビジネスルール）:
        - `asset_ids` が与えられた場合、アセットが存在し、かつ現在のユーザーの所有であることを検証します。
        - `product_ids` が与えられた場合、該当する製品が存在することを検証します。
        - `tags` はトリム・小文字化して正規化し、既存タグがあれば `usage_count` を増やして再利用、なければ新規作成します。
        - 関連（products/tags/assets）を設定し、DB に保存（commit）、作成した `Post` を返します。

        すべての検証はここに集約され、ルーターは薄く保たれます。
        """
        assets = self._validate_and_fetch_assets(post_in.asset_ids, current_user)
        products = self._validate_and_fetch_products(post_in.product_ids)
        tags = self._get_or_create_tags(post_in.tags)

        for tag in tags:
            tag.usage_count += 1

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
        limit: int = 20
    ) -> Tuple[List[Post], Optional[str], bool]:
        """公開投稿の一覧を cursor ベースのページネーションで取得します。

        Args:
            cursor: 継続取得用のカーソル（Base64 エンコード済み）
            limit: 取得件数（1-100）

        Returns:
            (posts, next_cursor, has_more) のタプル
            - posts: 投稿リスト
            - next_cursor: 次ページのカーソル（なければ None）
            - has_more: 次ページがあるか
        """
        query = (
            self.db.query(Post)
            .filter(Post.status == PostStatus.PUBLIC)
            .filter(Post.deleted_at.is_(None))
            .order_by(Post.created_at.desc(), Post.id.desc())
        )

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

        for post in posts:
            _ = post.user
            _ = post.assets
            _ = post.products
            _ = post.tags

        next_cursor = None
        if has_more and posts:
            last_post = posts[-1]
            next_cursor = encode_cursor(last_post.created_at, last_post.id)

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
            .filter(Post.deleted_at.is_(None))
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

    def update_post(
        self,
        *,
        post_id: str,
        post_in: PostUpdate,
        current_user: User,
        etag: Optional[str] = None,
    ) -> Post:
        """投稿を更新します。楽観的ロックと関連リソースの整合性を管理します。"""
        post = self.get_post_by_id(post_id=post_id, current_user=current_user)

        if post.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to edit this post",
            )

        if etag:
            current_etag = str(post.updated_at.timestamp())
            if etag.strip('"') != current_etag:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Post has been modified by another process",
                )

        update_data = post_in.model_dump(exclude_unset=True)

        if "asset_ids" in update_data:
            post.assets = self._validate_and_fetch_assets(update_data["asset_ids"], current_user)

        if "product_ids" in update_data:
            post.products = self._validate_and_fetch_products(update_data["product_ids"])

        if "tags" in update_data:
            current_tag_set = set(post.tags)
            new_tags = self._get_or_create_tags(update_data["tags"])
            new_tag_set = set(new_tags)
            for tag in new_tag_set:
                if tag not in current_tag_set:
                    tag.usage_count += 1

            for tag in current_tag_set:
                if tag not in new_tag_set:
                    tag.usage_count = max(0, tag.usage_count - 1)

            post.tags = new_tags

        for field, value in update_data.items():
            if field in {"asset_ids", "product_ids", "tags"}:
                continue
            setattr(post, field, value)

        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)
        return post

    def delete_post(self, *, post_id: str, current_user: User) -> None:
        """投稿を論理削除します。"""
        from datetime import datetime, timezone

        post = self.get_post_by_id(post_id=post_id, current_user=current_user)

        if post.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this post",
            )

        post.deleted_at = datetime.now(timezone.utc)

        # タグカウント減算
        # NOTE: 将来的に復元機能を実装する場合、ここで減算した usage_count を
        #       復元時に再度加算する必要あり。
        for tag in post.tags:
            tag.usage_count = max(0, tag.usage_count - 1)

        self.db.add(post)
        self.db.commit()


def post_service_factory(db: Session) -> PostService:
    return PostService(db)


post_service = None
