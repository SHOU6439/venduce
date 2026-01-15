from typing import Optional
from fastapi import APIRouter, Depends, status, Query, HTTPException

from app.db.database import get_db
from app.models.user import User
from app.schemas.purchase import PurchaseCreate, PurchaseRead
from app.schemas.pagination import PaginatedResponse, CursorMeta
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

    return PaginatedResponse(
        items=[PurchaseRead.model_validate(p) for p in purchases],
        meta=CursorMeta(
            next_cursor=next_cursor,
            has_more=has_more,
            returned=len(purchases),
        ),
    )


__all__ = ["router"]
