"""PaymentMethodモデルのインスタンスを作成するファクトリ。"""
import factory
from ulid import ULID

from app.models.payment_method import PaymentMethod
from app.models.enums import PaymentType
from app.utils.timezone import now_utc


class PaymentMethodFactory(factory.alchemy.SQLAlchemyModelFactory):
    """PaymentMethodインスタンスを作成するファクトリ。

    使い方:
        payment_method = PaymentMethodFactory(user_id=user.id, payment_type=PaymentType.CREDIT_CARD)
    """

    class Meta:
        model = PaymentMethod
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(lambda: str(ULID()))
    user_id = None
    payment_type = PaymentType.CREDIT_CARD
    name = factory.Faker("word")
    details = {"last4": "1234", "brand": "Visa"}
    is_default = False
    created_at = factory.LazyFunction(now_utc)
    updated_at = factory.LazyFunction(now_utc)
