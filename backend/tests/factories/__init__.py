"""テスト用のファクトリ群。

このモジュールは factory-boy を用いたテストデータ生成ファクトリを提供します。
すべてのファクトリは SQLAlchemyModelFactory を利用し、テストデータベースへ自動でコミットされます。
"""

from tests.factories.user import UserFactory
from tests.factories.refresh_token import RefreshTokenFactory
from tests.factories.asset_factory import AssetFactory
from tests.factories.post_factory import PostFactory
from tests.factories.tag_factory import TagFactory
from tests.factories.product_factory import ProductFactory
from tests.factories.payment_method_factory import PaymentMethodFactory
from tests.factories.purchase_factory import PurchaseFactory

__all__ = [
    "UserFactory",
    "RefreshTokenFactory",
    "AssetFactory",
    "PostFactory",
    "TagFactory",
    "ProductFactory",
    "PaymentMethodFactory",
    "PurchaseFactory",
]
