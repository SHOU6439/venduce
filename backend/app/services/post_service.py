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
from app.models.post_assets import PostAsset


class PostService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _enrich_post_with_asset_products(self, post: Post) -> Post:
        """Post オブジェクトに asset_products 属性を付与します。
        
        PostAsset テーブルから画像と商品の紐付け情報を取得し、
        post.asset_products リストを構築します。
        """
        post_assets = (
            self.db.query(PostAsset)
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
        - `asset_product_pairs` が与えられた場合、各アセットが存在し、かつ現在のユーザーの所有であることを検証します。
        - `product_ids` が与えられた場合、該当する製品が存在することを検証します。
        - `tags` はトリム・小文字化して正規化し、既存タグがあれば `usage_count` を増やして再利用、なければ新規作成します。
        - PostAsset テーブルに各画像と商品の紐付けを記録します。
        - 関連（products/tags/assets）を設定し、DB に保存（commit）、作成した `Post` を返します。

        すべての検証はここに集約され、ルーターは薄く保たれます。
        """


        assets: List[Asset] = []
        asset_product_map: dict = {}
        
        if post_in.asset_product_pairs:
            asset_ids = [pair.asset_id for pair in post_in.asset_product_pairs]
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

            for pair in post_in.asset_product_pairs:
                asset_product_map[pair.asset_id] = pair.product_id

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

        if asset_product_map:
            product_ids_in_pairs = {pid for pid in asset_product_map.values() if pid}
            if product_ids_in_pairs:
                existing_products = self.db.query(Product).filter(Product.id.in_(product_ids_in_pairs)).all()
                existing_ids = {p.id for p in existing_products}
                missing_ids = product_ids_in_pairs - existing_ids
                if missing_ids:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"One or more products in asset pairs not found: {missing_ids}",
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

        self.db.add(post)
        self.db.flush()  # post.id を取得するために flush を先に実行

        # PostAsset テーブルに各画像と商品の紐付けを記録
        for asset in assets:
            product_id = asset_product_map.get(asset.id)
            post_asset = PostAsset(
                post_id=post.id,
                asset_id=asset.id,
                product_id=product_id
            )
            self.db.add(post_asset)

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
            self._enrich_post_with_asset_products(post)

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


def post_service_factory(db: Session) -> PostService:
    return PostService(db)


post_service = None
