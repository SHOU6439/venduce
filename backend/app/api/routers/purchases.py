from typing import Optional
from fastapi import APIRouter, Depends, status, Query, HTTPException

from app.db.database import get_db
from app.models.user import User
from app.schemas.purchase import PurchaseCreate, PurchaseRead
from app.schemas.pagination import PaginatedResponse, CursorMeta
from app.schemas.product import ProductRead
from app.schemas.payment_method import PaymentMethodRead
from app.services.purchase_service import PurchaseService
from app.services.badge_service import BadgeService
from app.services.notification_service import NotificationService
from app.models.enums import BadgeCategory, NotificationType
from app.deps import get_current_user, get_purchase_service, get_badge_service, get_notification_service
from app.core.ws_manager import fire_and_forget_broadcast
from sqlalchemy.orm import Session

router = APIRouter(redirect_slashes=False)


@router.post("", response_model=PurchaseRead, status_code=status.HTTP_201_CREATED)
def create_purchase(
    payload: PurchaseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PurchaseService = Depends(get_purchase_service),
    badge_service: BadgeService = Depends(get_badge_service),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """支払い方法選択後に購入記録を作成します。
    
    referring_post_id が指定された場合：
    - 購入が投稿に帰属
    - 投稿の purchase_count がインクリメント
    - 投稿者のバッジ自動判定を実行
    
    referring_post_id が None の場合：
    - 直接購入（投稿への帰属なし）
    - ユーザーの購入履歴のみ記録
    """
    purchase = service.create_purchase(db, payload=payload, buyer=current_user)

    # 投稿経由の購入の場合、投稿者に対してバッジ自動付与を判定
    if payload.referring_post_id and purchase.referring_post:
        post_owner_id = purchase.referring_post.user_id
        badge_service.ensure_default_badges()
        badge_service.evaluate_and_award(
            post_owner_id,
            categories=[BadgeCategory.DRIVEN_PURCHASES],
        )

    # 購入者自身の購入数バッジを判定
    try:
        badge_service.ensure_default_badges()
        badge_service.evaluate_and_award(
            current_user.id,
            categories=[BadgeCategory.PURCHASES_MADE],
        )
    except Exception:
        pass

    # ランキングに影響するため全クライアントに通知
    fire_and_forget_broadcast("ranking_updated")

    # 投稿経由の購入の場合、投稿主に「購入されました」通知を送信
    if payload.referring_post_id and purchase.referring_post:
        post_owner_id = purchase.referring_post.user_id
        if post_owner_id != current_user.id:
            try:
                notification_service.create_notification(
                    user_id=post_owner_id,
                    actor_id=current_user.id,
                    notification_type=NotificationType.PURCHASE,
                    entity_id=payload.referring_post_id,
                    message=f"{current_user.username} があなたの投稿から商品を購入しました",
                )
            except Exception:
                pass

    return purchase


@router.get("/{user_id}", response_model=PaginatedResponse[PurchaseRead])
def list_user_purchases(
    user_id: str,
    cursor: Optional[str] = Query(default=None, description="Cursor for pagination"),
    limit: int = Query(default=20, ge=1, le=100, description="Number of items to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PurchaseService = Depends(get_purchase_service),
):
    """ユーザーの購入履歴を cursor ベースのページネーションで取得します。
    
    ユーザーは自分の購入履歴のみ閲覧可能です。
    """
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    purchases, next_cursor, has_more = service.list_user_purchases(
        db, user=current_user, cursor=cursor, limit=limit
    )

    # Purchase オブジェクトにProduct情報を含める
    result = []
    for p in purchases:
        purchase_dict = {
            'id': p.id,
            'buyer_id': p.buyer_id,
            'product_id': p.product_id,
            'quantity': p.quantity,
            'price_cents': p.price_cents,
            'total_amount_cents': p.total_amount_cents,
            'currency': p.currency,
            'payment_method_id': p.payment_method_id,
            'referring_post_id': p.referring_post_id,
            'status': p.status,
            'created_at': p.created_at,
            'updated_at': p.updated_at,
            'product': ProductRead.model_validate(p.product) if p.product else None,
        }
        result.append(PurchaseRead.model_validate(purchase_dict))

    return PaginatedResponse(
        items=result,
        meta=CursorMeta(
            next_cursor=next_cursor,
            has_more=has_more,
            returned=len(purchases),
        ),
    )


@router.get("/detail/{purchase_id}", response_model=PurchaseRead)
def get_purchase_detail(
    purchase_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PurchaseService = Depends(get_purchase_service),
):
    """購入詳細を取得します。
    
    ユーザーは自分の購入履歴のみ閲覧可能です。
    """
    purchase = service.get_purchase(db, purchase_id=purchase_id)
    
    if purchase.buyer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    purchase_dict = {
        'id': purchase.id,
        'buyer_id': purchase.buyer_id,
        'product_id': purchase.product_id,
        'quantity': purchase.quantity,
        'price_cents': purchase.price_cents,
        'total_amount_cents': purchase.total_amount_cents,
        'currency': purchase.currency,
        'payment_method_id': purchase.payment_method_id,
        'referring_post_id': purchase.referring_post_id,
        'status': purchase.status,
        'created_at': purchase.created_at,
        'updated_at': purchase.updated_at,
        'product': ProductRead.model_validate(purchase.product) if purchase.product else None,
        'payment_method': PaymentMethodRead.model_validate(purchase.payment_method) if purchase.payment_method else None,
    }
    return PurchaseRead.model_validate(purchase_dict)


__all__ = ["router"]
