from __future__ import annotations

from typing import List, Tuple, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.purchase import Purchase
from app.models.post import Post
from app.models.user import User
from app.models.payment_method import PaymentMethod
from app.models.enums import PostStatus, PurchaseStatus
from app.schemas.purchase import PurchaseCreate
from app.utils.cursor import encode_cursor, decode_cursor


class PurchaseService:
    """購入記録の作成と帰属トラッキングをサポート。"""

    def create_purchase(
        self, db: Session, *, payload: PurchaseCreate, buyer: User
    ) -> Purchase:
        """購入記録を作成します（投稿帰属トラッキング付き）。
        
        referring_post_id が指定された場合：
        - 投稿が存在し PUBLIC 状態であることを検証
        - post.purchase_count をインクリメント（トランザクション安全）
        
        referring_post_id が None の場合：
        - 投稿への帰属なし、purchase_count は変更なし
        """

        payment_method = (
            db.query(PaymentMethod)
            .filter_by(id=payload.payment_method_id, user_id=buyer.id)
            .first()
        )
        if not payment_method:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment method not found or access denied",
            )

        if payload.referring_post_id:
            post = (
                db.query(Post)
                .filter(
                    Post.id == payload.referring_post_id,
                    Post.status == PostStatus.PUBLIC,
                )
                .first()
            )
            if not post:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Referring post not found or not public",
                )

        purchase = Purchase(
            buyer_id=buyer.id,
            product_id=payload.product_id,
            quantity=payload.quantity,
            price_cents=payload.price_cents,
            total_amount_cents=payload.total_amount_cents,
            currency=payload.currency,
            payment_method_id=payload.payment_method_id,
            referring_post_id=payload.referring_post_id,
            status="completed",
        )

        db.add(purchase)

        if payload.referring_post_id:
            post.purchase_count += 1

        db.commit()
        db.refresh(purchase)
        return purchase

    def get_purchase(self, db: Session, *, purchase_id: str) -> Purchase:
        """ID から購入記録を取得します。"""
        purchase = db.query(Purchase).filter(Purchase.id == purchase_id).first()
        if not purchase:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Purchase not found",
            )
        return purchase

    def list_user_purchases(
        self, db: Session, *, user: User, cursor: Optional[str] = None, limit: int = 20
    ) -> Tuple[List[Purchase], Optional[str], bool]:
        """ユーザーの購入履歴を cursor ベースのページネーションで取得します。"""
        query = (
            db.query(Purchase)
            .filter(Purchase.buyer_id == user.id)
            .order_by(Purchase.created_at.desc(), Purchase.id.desc())
        )

        if cursor:
            cursor_created_at, cursor_id = decode_cursor(cursor)
            query = query.filter(
                (Purchase.created_at < cursor_created_at)
                | ((Purchase.created_at == cursor_created_at) & (Purchase.id < cursor_id))
            )

        purchases = query.limit(limit + 1).all()

        has_more = len(purchases) > limit
        if has_more:
            purchases = purchases[:limit]

        next_cursor = None
        if has_more and purchases:
            last_purchase = purchases[-1]
            next_cursor = encode_cursor(last_purchase.created_at, last_purchase.id)

        return purchases, next_cursor, has_more


purchase_service = PurchaseService()

__all__ = ["PurchaseService", "purchase_service"]
