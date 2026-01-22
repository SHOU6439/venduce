"""Productモデルのインスタンスを作成するファクトリ。"""
import factory
from ulid import ULID

from app.models.product import Product
from app.utils.timezone import now_utc


class ProductFactory(factory.alchemy.SQLAlchemyModelFactory):
    """Productインスタンスを作成するファクトリ。

    使い方:
        product = ProductFactory(brand_id=brand.id, status="published")
    """

    class Meta:
        model = Product
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(lambda: str(ULID()))
    title = factory.Faker("word")
    sku = factory.Faker("bothify", text="SKU-????-######")
    description = factory.Faker("sentence")
    price_cents = 9999
    currency = "JPY"
    stock_quantity = 100
    status = "published"
    brand_id = None
    extra_metadata = None
    created_at = factory.LazyFunction(now_utc)
    updated_at = factory.LazyFunction(now_utc)
