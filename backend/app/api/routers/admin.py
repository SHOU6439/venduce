"""管理者用統合 API ルーター

全エンドポイントは get_admin_user で保護されており、
is_admin=True のユーザーのみアクセス可能。
"""

import os
from typing import Optional, List
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload, selectinload
from datetime import datetime

from app.db.database import get_db
from app.deps import get_admin_user, get_asset_service
from app.models.user import User
from app.models.product import Product
from app.models.category import Category
from app.models.brand import Brand
from app.models.asset import Asset
from app.models.post import Post
from app.models.badge import Badge, UserBadge
from app.models.purchase import Purchase
from app.models.enums import ProductStatus
from app.schemas.asset import AssetRead
from app.schemas.admin import (
    AdminPaginatedResponse,
    DashboardStats,
    AdminUserRead,
    AdminUserUpdate,
    AdminUserListResponse,
    AdminAssetInfo,
    AdminProductRead,
    AdminProductCreate,
    AdminProductUpdate,
    AdminProductListResponse,
    AdminCategoryRead,
    AdminCategoryCreate,
    AdminCategoryUpdate,
    AdminCategoryListResponse,
    AdminBrandRead,
    AdminBrandCreate,
    AdminBrandUpdate,
    AdminBrandListResponse,
    AdminPostRead,
    AdminPostUpdate,
    AdminPostListResponse,
    AdminPurchaseRead,
    AdminPurchaseUpdate,
    AdminPurchaseListResponse,
)
from app.services.asset_service import AssetService
from app.utils.file_validation import (
    assert_allowed_image, detect_mime_type, extract_image_info, FileValidationError,
)

router = APIRouter()


# ═══════════════════════════════════════════════════════════
# ダッシュボード
# ═══════════════════════════════════════════════════════════

@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    return DashboardStats(
        total_users=db.query(func.count(User.id)).scalar() or 0,
        total_products=db.query(func.count(Product.id)).scalar() or 0,
        total_posts=db.query(func.count(Post.id)).filter(Post.deleted_at.is_(None)).scalar() or 0,
        total_categories=db.query(func.count(Category.id)).scalar() or 0,
        total_brands=db.query(func.count(Brand.id)).scalar() or 0,
        total_purchases=db.query(func.count(Purchase.id)).scalar() or 0,
    )


# ═══════════════════════════════════════════════════════════
# ユーザー管理
# ═══════════════════════════════════════════════════════════

@router.get("/users", response_model=AdminUserListResponse)
def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, description="ユーザー名・メールで検索"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    query = db.query(User).options(joinedload(User.avatar_asset))

    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                User.username.ilike(search),
                User.email.ilike(search),
                User.first_name.ilike(search),
                User.last_name.ilike(search),
            )
        )

    total = query.count()
    total_pages = max(1, (total + per_page - 1) // per_page)
    items = query.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return AdminUserListResponse(
        items=[AdminUserRead.model_validate(u) for u in items],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/users/{user_id}", response_model=AdminUserRead)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    user = db.query(User).options(joinedload(User.avatar_asset)).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    return AdminUserRead.model_validate(user)


@router.patch("/users/{user_id}", response_model=AdminUserRead)
def update_user(
    user_id: str,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    user = db.query(User).options(joinedload(User.avatar_asset)).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return AdminUserRead.model_validate(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="自分自身は削除できません")
    db.delete(user)
    db.commit()


# ═══════════════════════════════════════════════════════════
# 商品管理
# ═══════════════════════════════════════════════════════════

MIME_SAMPLE_BYTES = 4096


def _product_to_read(product: Product) -> AdminProductRead:
    """Product ORM → AdminProductRead (画像情報含む)"""
    return AdminProductRead(
        id=product.id,
        title=product.title,
        sku=product.sku,
        description=product.description,
        price_cents=product.price_cents,
        currency=product.currency,
        stock_quantity=product.stock_quantity,
        status=product.status,
        brand_id=product.brand_id,
        images=[
            AdminAssetInfo(id=a.id, public_url=a.public_url, content_type=a.content_type)
            for a in (product.assets or [])
        ],
        category_ids=[c.id for c in (product.categories or [])],
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


@router.post("/products/upload-image", response_model=AssetRead, status_code=status.HTTP_201_CREATED)
async def upload_product_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
    asset_service: AssetService = Depends(get_asset_service),
):
    """管理者用: 商品画像をアップロードし Asset を返す"""
    file.file.seek(0, os.SEEK_END)
    size_bytes = file.file.tell()
    file.file.seek(0)
    if size_bytes <= 0:
        raise HTTPException(status_code=400, detail="空のファイルです")

    sample = file.file.read(MIME_SAMPLE_BYTES)
    file.file.seek(0)
    content_type = detect_mime_type(file.filename or "", sample) or file.content_type
    if not content_type:
        raise HTTPException(status_code=400, detail="MIMEタイプを検出できません")

    try:
        assert_allowed_image(content_type, size_bytes)
        image_info = extract_image_info(file.file)
    except FileValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    asset = asset_service.create_asset(
        db,
        owner_id=admin.id,
        purpose="product_image",
        filename=file.filename or "upload.bin",
        content_type=content_type,
        fileobj=file.file,
        size_bytes=size_bytes,
        width=image_info.width,
        height=image_info.height,
    )
    return AssetRead.model_validate(asset, from_attributes=True)


@router.post("/products", response_model=AdminProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: AdminProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    existing = db.query(Product).filter(Product.sku == payload.sku).first()
    if existing:
        raise HTTPException(status_code=409, detail="このSKUは既に使われています")

    product = Product(
        title=payload.title,
        sku=payload.sku,
        description=payload.description,
        price_cents=payload.price_cents,
        currency=payload.currency,
        stock_quantity=payload.stock_quantity,
        status=payload.status.value,
        brand_id=payload.brand_id or None,
    )

    if payload.category_ids:
        categories = db.query(Category).filter(Category.id.in_(payload.category_ids)).all()
        product.categories = categories

    if payload.asset_ids:
        assets = db.query(Asset).filter(Asset.id.in_(payload.asset_ids)).all()
        product.assets = assets

    db.add(product)
    db.commit()
    db.refresh(product)
    return _product_to_read(product)


@router.get("/products", response_model=AdminProductListResponse)
def list_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, description="商品名で検索"),
    status_filter: Optional[str] = Query(None, alias="status", description="ステータスフィルター"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    query = db.query(Product).options(
        selectinload(Product.assets),
        selectinload(Product.categories),
    )

    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(Product.title.ilike(search), Product.sku.ilike(search))
        )
    if status_filter:
        query = query.filter(Product.status == status_filter)

    total = query.count()
    total_pages = max(1, (total + per_page - 1) // per_page)
    items = query.order_by(Product.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return AdminProductListResponse(
        items=[_product_to_read(p) for p in items],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/products/{product_id}", response_model=AdminProductRead)
def get_product(
    product_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    product = db.query(Product).options(
        selectinload(Product.assets),
        selectinload(Product.categories),
    ).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品が見つかりません")
    return _product_to_read(product)


@router.patch("/products/{product_id}", response_model=AdminProductRead)
def update_product(
    product_id: str,
    payload: AdminProductUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    product = db.query(Product).options(
        selectinload(Product.assets),
        selectinload(Product.categories),
    ).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品が見つかりません")

    update_data = payload.model_dump(exclude_unset=True)

    # M2Mリレーションの更新
    if "category_ids" in update_data:
        cat_ids = update_data.pop("category_ids")
        if cat_ids is not None:
            product.categories = db.query(Category).filter(Category.id.in_(cat_ids)).all() if cat_ids else []

    if "asset_ids" in update_data:
        asset_ids = update_data.pop("asset_ids")
        if asset_ids is not None:
            product.assets = db.query(Asset).filter(Asset.id.in_(asset_ids)).all() if asset_ids else []

    for key, value in update_data.items():
        if key == "status" and isinstance(value, ProductStatus):
            value = value.value
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return _product_to_read(product)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="商品が見つかりません")
    db.delete(product)
    db.commit()


# ═══════════════════════════════════════════════════════════
# カテゴリ管理
# ═══════════════════════════════════════════════════════════

@router.get("/categories", response_model=AdminCategoryListResponse)
def list_categories(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    query = db.query(Category)
    if q:
        query = query.filter(Category.name.ilike(f"%{q}%"))

    total = query.count()
    total_pages = max(1, (total + per_page - 1) // per_page)
    items = query.order_by(Category.name.asc()).offset((page - 1) * per_page).limit(per_page).all()

    return AdminCategoryListResponse(
        items=[AdminCategoryRead.model_validate(c) for c in items],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.post("/categories", response_model=AdminCategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: AdminCategoryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    slug = (payload.slug or payload.name).strip().lower().replace(" ", "-")
    existing = db.query(Category).filter(Category.slug == slug).first()
    if existing:
        raise HTTPException(status_code=409, detail="このslugは既に使われています")

    category = Category(
        name=payload.name,
        slug=slug,
        description=payload.description,
        parent_id=payload.parent_id,
        is_active=payload.is_active,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return AdminCategoryRead.model_validate(category)


@router.patch("/categories/{category_id}", response_model=AdminCategoryRead)
def update_category(
    category_id: str,
    payload: AdminCategoryUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="カテゴリが見つかりません")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)

    db.commit()
    db.refresh(category)
    return AdminCategoryRead.model_validate(category)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="カテゴリが見つかりません")
    db.delete(category)
    db.commit()


# ═══════════════════════════════════════════════════════════
# ブランド管理
# ═══════════════════════════════════════════════════════════

@router.get("/brands", response_model=AdminBrandListResponse)
def list_brands(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    query = db.query(Brand)
    if q:
        query = query.filter(Brand.name.ilike(f"%{q}%"))

    total = query.count()
    total_pages = max(1, (total + per_page - 1) // per_page)
    items = query.order_by(Brand.name.asc()).offset((page - 1) * per_page).limit(per_page).all()

    return AdminBrandListResponse(
        items=[AdminBrandRead.model_validate(b) for b in items],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.post("/brands", response_model=AdminBrandRead, status_code=status.HTTP_201_CREATED)
def create_brand(
    payload: AdminBrandCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    slug = (payload.slug or payload.name).strip().lower().replace(" ", "-")
    existing = db.query(Brand).filter(Brand.slug == slug).first()
    if existing:
        raise HTTPException(status_code=409, detail="このslugは既に使われています")

    brand = Brand(
        name=payload.name,
        slug=slug,
        description=payload.description,
        is_active=payload.is_active,
    )
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return AdminBrandRead.model_validate(brand)


@router.patch("/brands/{brand_id}", response_model=AdminBrandRead)
def update_brand(
    brand_id: str,
    payload: AdminBrandUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="ブランドが見つかりません")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(brand, key, value)

    db.commit()
    db.refresh(brand)
    return AdminBrandRead.model_validate(brand)


@router.delete("/brands/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(
    brand_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="ブランドが見つかりません")
    db.delete(brand)
    db.commit()


# ═══════════════════════════════════════════════════════════
# 投稿管理
# ═══════════════════════════════════════════════════════════

def _post_to_read(post: Post) -> AdminPostRead:
    return AdminPostRead(
        id=post.id,
        user_id=post.user_id,
        username=post.user.username if post.user else None,
        caption=post.caption,
        status=post.status.value if hasattr(post.status, "value") else str(post.status),
        purchase_count=post.purchase_count,
        view_count=post.view_count,
        like_count=post.like_count,
        created_at=post.created_at,
        updated_at=post.updated_at,
        deleted_at=post.deleted_at,
    )


@router.get("/posts", response_model=AdminPostListResponse)
def list_posts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, description="キャプションで検索"),
    status_filter: Optional[str] = Query(None, alias="status", description="ステータスフィルター"),
    include_deleted: bool = Query(False, description="削除済みも含める"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    query = db.query(Post).options(joinedload(Post.user))

    if not include_deleted:
        query = query.filter(Post.deleted_at.is_(None))

    if q:
        query = query.filter(Post.caption.ilike(f"%{q}%"))
    if status_filter:
        query = query.filter(Post.status == status_filter)

    total = query.count()
    total_pages = max(1, (total + per_page - 1) // per_page)
    items = query.order_by(Post.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return AdminPostListResponse(
        items=[_post_to_read(p) for p in items],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/posts/{post_id}", response_model=AdminPostRead)
def get_post(
    post_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    post = db.query(Post).options(joinedload(Post.user)).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="投稿が見つかりません")
    return _post_to_read(post)


@router.patch("/posts/{post_id}", response_model=AdminPostRead)
def update_post(
    post_id: str,
    payload: AdminPostUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    post = db.query(Post).options(joinedload(Post.user)).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="投稿が見つかりません")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(post, key, value)

    db.commit()
    db.refresh(post)
    return _post_to_read(post)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: str,
    hard: bool = Query(False, description="完全削除する場合 true"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="投稿が見つかりません")

    if hard:
        db.delete(post)
    else:
        post.deleted_at = func.now()
    db.commit()


# ═══════════════════════════════════════════════════════════
# 購入管理
# ═══════════════════════════════════════════════════════════

def _purchase_to_read(p: Purchase) -> AdminPurchaseRead:
    return AdminPurchaseRead(
        id=p.id,
        buyer_id=p.buyer_id,
        buyer_username=p.buyer.username if p.buyer else None,
        product_id=p.product_id,
        product_title=p.product.title if p.product else None,
        quantity=p.quantity,
        price_cents=p.price_cents,
        total_amount_cents=p.total_amount_cents,
        currency=p.currency,
        status=p.status.value if hasattr(p.status, "value") else str(p.status),
        referring_post_id=p.referring_post_id,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


@router.get("/purchases", response_model=AdminPurchaseListResponse)
def list_purchases(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, description="購入者名・商品名で検索"),
    status_filter: Optional[str] = Query(None, alias="status", description="ステータスフィルター"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    query = db.query(Purchase).options(
        joinedload(Purchase.buyer),
        joinedload(Purchase.product),
    )

    if q:
        search = f"%{q}%"
        query = query.join(Purchase.buyer).join(Purchase.product).filter(
            or_(
                User.username.ilike(search),
                Product.title.ilike(search),
            )
        )
    if status_filter:
        query = query.filter(Purchase.status == status_filter)

    total = query.count()
    total_pages = max(1, (total + per_page - 1) // per_page)
    items = query.order_by(Purchase.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return AdminPurchaseListResponse(
        items=[_purchase_to_read(p) for p in items],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/purchases/{purchase_id}", response_model=AdminPurchaseRead)
def get_purchase(
    purchase_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    p = db.query(Purchase).options(
        joinedload(Purchase.buyer),
        joinedload(Purchase.product),
    ).filter(Purchase.id == purchase_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="購入が見つかりません")
    return _purchase_to_read(p)


@router.patch("/purchases/{purchase_id}", response_model=AdminPurchaseRead)
def update_purchase(
    purchase_id: str,
    payload: AdminPurchaseUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    p = db.query(Purchase).options(
        joinedload(Purchase.buyer),
        joinedload(Purchase.product),
    ).filter(Purchase.id == purchase_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="購入が見つかりません")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(p, key, value)

    db.commit()
    db.refresh(p)
    return _purchase_to_read(p)


@router.delete("/purchases/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase(
    purchase_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    p = db.query(Purchase).filter(Purchase.id == purchase_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="購入が見つかりません")
    db.delete(p)
    db.commit()
