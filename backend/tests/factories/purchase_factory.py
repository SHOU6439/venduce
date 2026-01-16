"""Purchaseモデルのインスタンスを作成するファクトリ。"""
import factory
from ulid import ULID

from app.models.purchase import Purchase
from app.models.enums import PurchaseStatus
from app.utils.timezone import now_utc


class PurchaseFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Purchaseインスタンスを作成するファクトリ。

    使い方:
        purchase = PurchaseFactory(buyer_id=user.id, product_id=product.id)
    """

    class Meta:
        model = Purchase
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(lambda: str(ULID()))
    buyer_id = None
    product_id = None
    quantity = 1
    price_cents = 9999
    total_amount_cents = 9999
    currency = "JPY"
    payment_method_id = None
    referring_post_id = None
    status = PurchaseStatus.COMPLETED
    created_at = factory.LazyFunction(now_utc)
    updated_at = factory.LazyFunction(now_utc)
