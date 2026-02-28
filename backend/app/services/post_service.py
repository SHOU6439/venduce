from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException, status

from app.models.post import Post
from app.models.asset import Asset
from app.models.product import Product
from app.models.tag import Tag
from app.models.user import User
from app.models.enums import PostStatus
from app.schemas.post import PostCreate, PostUpdate
from app.utils.cursor import encode_cursor, decode_cursor
from app.models.post_assets import PostAsset


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

    def _enrich_post_with_asset_products(self, post: Post) -> Post:
        """Post オブジェクトに asset_products 属性を付与します。

        PostAsset テーブルから画像と商品の紐付け情報を取得し、
        post.asset_products リストを構築します。
        """

        post_assets = (
            self.db.query(PostAsset)
            .options(
                selectinload(PostAsset.asset),
                selectinload(PostAsset.product)
            )
            .filter(PostAsset.post_id == post.id)
            .all()
        )

        asset_products = []
        for pa in post_assets:
            asset_dict = {
                'id': pa.asset.id,
                'owner_id': pa.asset.owner_id,
                'purpose': pa.asset.purpose,
                'status': pa.asset.status,
                'storage_key': pa.asset.storage_key,
                'content_type': pa.asset.content_type,
                'extension': pa.asset.extension,
                'size_bytes': pa.asset.size_bytes,
                'width': pa.asset.width,
                'height': pa.asset.height,
                'checksum': pa.asset.checksum,
                'variants': pa.asset.variants,
                'public_url': pa.asset.public_url,
                'metadata': pa.asset.extra_metadata,
                'created_at': pa.asset.created_at,
                'updated_at': pa.asset.updated_at,
            }

            product_dict = None
            if pa.product:
                # 商品のアセット情報も取得
                product_assets = [
                    {
                        'id': asset.id,
                        'owner_id': asset.owner_id,
                        'purpose': asset.purpose,
                        'status': asset.status,
                        'storage_key': asset.storage_key,
                        'content_type': asset.content_type,
                        'extension': asset.extension,
                        'size_bytes': asset.size_bytes,
                        'width': asset.width,
                        'height': asset.height,
                        'checksum': asset.checksum,
                        'public_url': asset.public_url,
                        'variants': asset.variants,
                        'extra_metadata': asset.extra_metadata,
                    }
                    for asset in pa.product.assets
                ]

                product_dict = {
                    'id': pa.product.id,
                    'title': pa.product.title,
                    'sku': pa.product.sku,
                    'description': pa.product.description,
                    'price_cents': pa.product.price_cents,
                    'currency': pa.product.currency,
                    'status': pa.product.status,
                    'stock_quantity': pa.product.stock_quantity,
                    'extra_metadata': pa.product.extra_metadata,
                    'created_at': pa.product.created_at,
                    'updated_at': pa.product.updated_at,
                    'assets': product_assets,  # アセット情報を追加
                }

            asset_products.append({
                'asset': asset_dict,
                'product': product_dict
            })

        post.asset_products = asset_products
        return post

    def create_post(self, *, post_in: PostCreate, current_user: User) -> Post:
        """`PostCreate` から `Post` を作成して返します。

        実行内容（ビジネスルール）:
        - `asset_product_pairs` は必須で最低1つのアセットが必要です。各アセットが存在し、かつ現在のユーザーの所有であることを検証します。
        - `product_ids` が与えられた場合、該当する製品が存在することを検証します。
        - `tags` はトリム・小文字化して正規化し、既存タグがあれば `usage_count` を増やして再利用、なければ新規作成します。
        - PostAsset テーブルに各画像と商品の紐付けを記録します。
        - 関連（products/tags）を設定し、DB に保存（commit）、作成した `Post` を返します。

        すべての検証はここに集約され、ルーターは薄く保たれます。
        """

        if not post_in.asset_product_pairs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one asset is required for post creation",
            )

        asset_product_map = self._validate_and_map_asset_products(post_in, current_user)
        products = self._validate_and_fetch_products(post_in.product_ids)
        tags = self._get_or_create_tags(post_in.tags)

        post_data = post_in.model_dump(exclude_unset=True, exclude={'asset_product_pairs', 'product_ids', 'tags'})
        post = Post(user_id=current_user.id, **post_data)
        post.products = products
        post.tags = tags

        for tag in tags:
            tag.usage_count += 1

        self.db.add(post)
        self.db.flush()

        for asset_id, product_id in asset_product_map.items():
            post_asset = PostAsset(
                post_id=post.id,
                asset_id=asset_id,
                product_id=product_id
            )
            self.db.add(post_asset)

        self.db.commit()
        self.db.refresh(post)
        self._enrich_post_with_asset_products(post)
        return post

    def _validate_and_map_asset_products(
        self,
        post_in: PostCreate,
        current_user: User
    ) -> dict:
        """アセット・商品ペアを検証し、マッピングを返す。

        Returns:
            {asset_id: product_id} のマッピング
        """
        asset_product_map = {}

        if not post_in.asset_product_pairs:
            return asset_product_map

        asset_ids = [pair.asset_id for pair in post_in.asset_product_pairs]
        if len(asset_ids) != len(set(asset_ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate asset_ids found in asset_product_pairs."
            )

        self._validate_and_fetch_assets(asset_ids, current_user)

        product_ids_from_pairs = {pair.product_id for pair in post_in.asset_product_pairs if pair.product_id}
        if product_ids_from_pairs:
            self._validate_and_fetch_products(list(product_ids_from_pairs))

        for pair in post_in.asset_product_pairs:
            asset_product_map[pair.asset_id] = pair.product_id

        return asset_product_map

    def get_public_posts(
        self,
        *,
        cursor: Optional[str] = None,
        limit: int = 20,
        user_id: Optional[str] = None,
    ) -> Tuple[List[Post], Optional[str], bool]:
        """公開投稿の一覧を cursor ベースのページネーションで取得します。

        Args:
            cursor: 継続取得用のカーソル（Base64 エンコード済み）
            limit: 取得件数（1-100）
            user_id: 指定すると特定ユーザーの投稿のみに絞り込む

        Returns:
            (posts, next_cursor, has_more) のタプル
            - posts: 投稿リスト
            - next_cursor: 次ページのカーソル
            - has_more: 次ページがあるか
        """
        query = (
            self.db.query(Post)
            .filter(Post.status == PostStatus.PUBLIC)
            .filter(Post.deleted_at.is_(None))
            .order_by(Post.created_at.desc(), Post.id.desc())
        )

        if user_id:
            query = query.filter(Post.user_id == user_id)

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
            self._enrich_post_with_asset_products(post)

        return posts, next_cursor, has_more

    def get_posts_by_user(self, *, user_id: str) -> List[Post]:
        """指定ユーザーの全投稿（削除済み除く）を新しい順で返します。

        プロフィールの累計いいね数・購入数集計に使用します。

        Args:
            user_id: ユーザー ID

        Returns:
            投稿リスト（集計用のため assets/products は読み込まない）
        """
        return (
            self.db.query(Post)
            .filter(Post.user_id == user_id)
            .filter(Post.deleted_at.is_(None))
            .filter(Post.status == PostStatus.PUBLIC)
            .order_by(Post.created_at.desc())
            .all()
        )

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
            self._enrich_post_with_asset_products(post)
            return post

        if not current_user or current_user.id != post.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this post"
            )

        self._enrich_post_with_asset_products(post)
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

        if "asset_product_pairs" in update_data:
            self.db.query(PostAsset).filter(PostAsset.post_id == post.id).delete()
            self.db.flush()

            assets_for_post = self._validate_and_fetch_assets(post_in.asset_ids, current_user)
            products_for_post = self._validate_and_fetch_products(post_in.product_ids)

            asset_ids_in_pairs = {pair.asset_id for pair in post_in.asset_product_pairs}
            if not asset_ids_in_pairs.issubset({a.id for a in assets_for_post}):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Some asset_ids in asset_product_pairs are not in asset_ids or not owned by user."
                )
            product_ids_in_pairs = {pair.product_id for pair in post_in.asset_product_pairs if pair.product_id}
            if not product_ids_in_pairs.issubset({p.id for p in products_for_post}):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Some product_ids in asset_product_pairs are not in product_ids."
                )

            post_assets = []
            for pair in post_in.asset_product_pairs:
                post_asset = PostAsset(
                    post_id=post.id,
                    asset_id=pair.asset_id,
                    product_id=pair.product_id
                )
                post_assets.append(post_asset)
            self.db.add_all(post_assets)
            post.post_assets_links = post_assets

        for field, value in update_data.items():
            if field in {"asset_ids", "product_ids", "tags", "asset_product_pairs"}:
                continue
            setattr(post, field, value)

        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)
        return post

    def delete_post(self, *, post_id: str, current_user: User) -> None:
        """投稿を論理削除します。"""

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

    def search_posts(
        self,
        *,
        query: str,
        limit: int = 20,
    ) -> List[Post]:
        """投稿をキャプションとタグで検索します（公開投稿のみ）。

        Args:
            query: 検索クエリ
            limit: 取得件数

        Returns:
            Post: マッチした投稿リスト
        """
        if not query.strip():
            return []

        search_term = f"%{query}%"
        posts = (
            self.db.query(Post)
            .filter(
                Post.status == PostStatus.PUBLIC,
                Post.caption.ilike(search_term)
            )
            .order_by(Post.created_at.desc())
            .limit(limit)
            .all()
        )

        for post in posts:
            _ = post.user
            _ = post.assets
            _ = post.products
            _ = post.tags
            self._enrich_post_with_asset_products(post)

        return posts


def post_service_factory(db: Session) -> PostService:
    return PostService(db)


post_service = None
