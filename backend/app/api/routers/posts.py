from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.post import Post
from app.models.tag import Tag
from app.models.product import Product
from app.models.asset import Asset
from app.schemas.post import PostCreate, PostRead

router = APIRouter(prefix="/api/posts", tags=["posts"])


@router.post("", response_model=PostRead, status_code=status.HTTP_201_CREATED)
def create_post(
    post_in: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. アセットの検証
    # アセットが存在し、かつユーザーが所有していることを確認して取得
    assets = db.query(Asset).filter(
        Asset.id.in_(post_in.asset_ids),
        Asset.owner_id == current_user.id
    ).all()

    if len(assets) != len(set(post_in.asset_ids)):
        found_ids = {a.id for a in assets}
        missing = set(post_in.asset_ids) - found_ids
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"One or more assets not found or permission denied: {missing}"
        )

    # 2. 商品の検証
    products = []
    if post_in.product_ids:
        products = db.query(Product).filter(Product.id.in_(post_in.product_ids)).all()
        if len(products) != len(set(post_in.product_ids)):
            found_ids = {p.id for p in products}
            missing = set(post_in.product_ids) - found_ids
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"One or more products not found: {missing}"
            )

    # 3. タグの処理
    tags = []
    if post_in.tags:
        normalized_names = {t.strip().lower() for t in post_in.tags if t.strip()}

        # 既存タグの検索
        existing_tags = db.query(Tag).filter(Tag.name.in_(normalized_names)).all()
        existing_map = {t.name: t for t in existing_tags}

        for name in normalized_names:
            if name in existing_map:
                tag = existing_map[name]
                tag.usage_count += 1
                tags.append(tag)
            else:
                new_tag = Tag(name=name, usage_count=1)
                db.add(new_tag)
                tags.append(new_tag)

    # 4. 投稿の作成
    post = Post(
        user_id=current_user.id,
        caption=post_in.caption,
        status=post_in.status,
        extra_metadata=post_in.extra_metadata,
    )

    post.products = products
    post.tags = tags

    db.add(post)
    db.commit()

    # TODO: 要検討

    # 5. アセットの紐付け
    # 5. アセットの紐付け
    # Assetモデルに `post_id` (ForeignKey) を設定して紐付ける（1対多）。
    # Asset.owner_id はユーザーIDのまま保持する。
    for asset in assets:
        asset.post_id = post.id

    # 変更を検知させるため assets を add_all (SQLAlchemyの動作として、オブジェクトの変更は自動追跡されるが、明示しておくと安心)
    db.add_all(assets)

    db.commit()
    db.refresh(post)

    # Note: `post.assets` はリレーションシップを通じて入力されています（`lazy="joined"` or refresh後）。
    # Pydantic の `PostRead` は `images` を期待しています。
    post.images = post.assets

    return post
