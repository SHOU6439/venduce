from typing import Optional
from fastapi import APIRouter, Depends, status, Query, HTTPException

from app.db.database import get_db
from app.models.user import User
from app.schemas.purchase import PurchaseCreate, PurchaseRead
from app.schemas.pagination import PaginatedResponse, CursorMeta
from app.schemas.product import ProductRead
from app.schemas.payment_method import PaymentMethodRead
from app.services.purchase_service import PurchaseService
from app.deps import get_current_user, get_purchase_service
from sqlalchemy.orm import Session

router = APIRouter()


@router.post("", response_model=PurchaseRead, status_code=status.HTTP_201_CREATED)
def create_purchase(
    payload: PurchaseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PurchaseService = Depends(get_purchase_service),
):
    """支払い方法選択後に購入記録を作成します。
    
    referring_post_id が指定された場合：
    - 購入が投稿に帰属
    - 投稿の purchase_count がインクリメント
    
    referring_post_id が None の場合：
    - 直接購入（投稿への帰属なし）
    - ユーザーの購入履歴のみ記録
    """
    return service.create_purchase(db, payload=payload, buyer=current_user)


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
