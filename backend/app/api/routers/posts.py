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
    # Asset.owner_id/type を更新してこの投稿に紐付けるか？
    # 実際には Asset は owner_id=user を持っている。
    # 現在の要件: "投稿は画像を持つ"。
    # アプローチ:
    # A) Asset.owner_type = 'post', Asset.owner_id = post.id (所有権の移転？それとも単なるコンテキスト？)
    # B) 中間テーブル `post_images`。
    # C) Asset が `post_id` FK を持つ。

    # `Asset` モデル定義によると:
    # `owner_id` は String, `owner_type` は String。
    # 通常、画像が投稿に属する場合、owner_type='post' と owner_id=post.id に変更するかもしれない。
    # しかし、ユーザーは依然として最終的な所有者である。
    # ここでは、この投稿コンテキストに属することを示すために `owner_type='post'` と `owner_id=post.id` を更新すると仮定する。
    # 警告: これを行うと、`current_user` はもはや直接の `owner_id` ではない（二重リンクしない限り）。
    # ただし、`Asset` は通常 "Attached to" を意味する。
    # あるいは `PostImage` テーブルを作成する。
    # しかしMVPでは、1:N の場合にポインタを更新して `Asset` を再利用するのが一般的。
    # 1つのアセットが複数の投稿に属することはあるか？ いいえ、通常 1 upload = 1 usage。

    # Asset を更新して投稿を指すようにするアプローチを採用する。
    for asset in assets:
        asset.owner_id = post.id
        asset.owner_type = "post"
        # 誰がアップロードしたかを別途追跡したい場合もあるが、`Asset` ロジックは通常 "Is Attached To X"。
        # 誰がアップロードしたかを知る必要がある場合は、`Post.user_id` を解釈する。

    db.add_all(assets)
    db.commit()
    db.refresh(post)

    # レスポンスのために画像を手動で設定する。`PostRead` がそれらを期待しているため。
    # また、リフレッシュ/イーガーロードなしで簡単に自動ロードする直接的なリレーションシップを設定していないため。
    # あるいは `post.py` でコメントアウトした `relationship` に依存するか。
    # 念のためフェッチされたアセットを使用する。

    post.images = assets

    return post
