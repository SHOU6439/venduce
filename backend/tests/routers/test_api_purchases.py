"""購入APIエンドポイントのテスト。"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.enums import PostStatus
from app.utils.jwt import create_access_token
from tests.factories import (
    UserFactory,
    PaymentMethodFactory,
    PostFactory,
    ProductFactory,
    PurchaseFactory,
)


@pytest.fixture
def client(db_session):
    """DBセッション依存性をオーバーライドした TestClient を返します。"""
    from app.db.database import get_db
    
    def override_get_db():
        return db_session
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def setup_purchase_data(db_session):
    """購入テスト用のテストデータをセットアップします。"""
    buyer = UserFactory(is_active=True, is_confirmed=True)
    db_session.add(buyer)
    db_session.commit()

    payment_method = PaymentMethodFactory(user_id=buyer.id)
    db_session.add(payment_method)
    db_session.commit()

    product = ProductFactory(status="published")
    db_session.add(product)
    db_session.commit()

    post_public = PostFactory(user_id=buyer.id, status=PostStatus.PUBLIC, purchase_count=0)
    db_session.add(post_public)
    db_session.commit()

    post_draft = PostFactory(user_id=buyer.id, status=PostStatus.DRAFT)
    db_session.add(post_draft)
    db_session.commit()

    return {
        "buyer": buyer,
        "payment_method": payment_method,
        "product": product,
        "post_public": post_public,
        "post_draft": post_draft,
    }


@pytest.fixture
def auth_headers(setup_purchase_data):
    """購入者の認証ヘッダーを生成します。"""
    buyer = setup_purchase_data["buyer"]
    token, _ = create_access_token(buyer.id)
    return {"Authorization": f"Bearer {token}"}, buyer


class TestPurchasesCreateWithPostAttribution:
    """投稿帰属付き購入作成のテスト。"""

    def test_create_purchase_with_post_attribution(self, client, db_session, auth_headers, setup_purchase_data):
        """投稿経由の購入を作成し、post.purchase_count がインクリメントされることを確認。"""
        headers, buyer = auth_headers
        data = setup_purchase_data

        db_session.refresh(data["post_public"])
        initial_count = data["post_public"].purchase_count

        payload = {
            "product_id": data["product"].id,
            "quantity": 1,
            "price_cents": 9999,
            "total_amount_cents": 9999,
            "currency": "JPY",
            "payment_method_id": data["payment_method"].id,
            "referring_post_id": data["post_public"].id,
        }

        response = client.post(
            "/api/purchases",
            json=payload,
            headers=headers,
        )

        assert response.status_code == 201
        purchase_data = response.json()
        assert purchase_data["buyer_id"] == buyer.id
        assert purchase_data["referring_post_id"] == data["post_public"].id
        assert purchase_data["status"] == "completed"

        db_session.refresh(data["post_public"])
        assert data["post_public"].purchase_count == initial_count + 1

    def test_create_purchase_post_not_public(self, client, auth_headers, setup_purchase_data):
        """PUBLIC でない投稿を指定すると 400 を返す。"""
        headers, buyer = auth_headers
        data = setup_purchase_data

        payload = {
            "product_id": data["product"].id,
            "quantity": 1,
            "price_cents": 9999,
            "total_amount_cents": 9999,
            "currency": "JPY",
            "payment_method_id": data["payment_method"].id,
            "referring_post_id": data["post_draft"].id,
        }

        response = client.post(
            "/api/purchases",
            json=payload,
            headers=headers,
        )

        assert response.status_code == 400
        assert "not public" in response.json()["detail"]

    def test_create_purchase_invalid_payment_method(self, client, auth_headers, setup_purchase_data):
        """存在しない支払い方法を指定すると 400 を返す。"""
        headers, buyer = auth_headers
        data = setup_purchase_data

        payload = {
            "product_id": data["product"].id,
            "quantity": 1,
            "price_cents": 9999,
            "total_amount_cents": 9999,
            "currency": "JPY",
            "payment_method_id": "invalid_payment_method_id",
            "referring_post_id": data["post_public"].id,
        }
        
        response = client.post(
            "/api/purchases",
            json=payload,
            headers=headers,
        )
        
        assert response.status_code == 400
        assert "Payment method" in response.json()["detail"]


class TestPurchasesCreateDirectPurchase:
    """投稿帰属なし直接購入のテスト。"""
    
    def test_create_direct_purchase(self, client, db_session, auth_headers, setup_purchase_data):
        """直接購入を作成し、purchase_count が変わらないことを確認。"""
        headers, buyer = auth_headers
        data = setup_purchase_data
        
        db_session.refresh(data["post_public"])
        initial_count = data["post_public"].purchase_count
        
        payload = {
            "product_id": data["product"].id,
            "quantity": 1,
            "price_cents": 9999,
            "total_amount_cents": 9999,
            "currency": "JPY",
            "payment_method_id": data["payment_method"].id,
            "referring_post_id": None,
        }
        
        response = client.post(
            "/api/purchases",
            json=payload,
            headers=headers,
        )
        
        assert response.status_code == 201
        purchase_data = response.json()
        assert purchase_data["referring_post_id"] is None
        
        db_session.refresh(data["post_public"])
        assert data["post_public"].purchase_count == initial_count


class TestPurchasesListHistory:
    """購入履歴の一覧取得のテスト。"""
    
    def test_list_purchases_empty(self, client, auth_headers, setup_purchase_data):
        """購入がない場合、空リストを返す。"""
        headers, buyer = auth_headers
        
        response = client.get(
            f"/api/purchases/{buyer.id}",
            headers=headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["meta"]["returned"] == 0
        assert data["meta"]["has_more"] is False
    
    def test_list_purchases_multiple(self, client, db_session, auth_headers, setup_purchase_data):
        """複数の購入履歴を取得できることを確認。"""
        headers, buyer = auth_headers
        data = setup_purchase_data
        
        p1 = PurchaseFactory(buyer_id=buyer.id, product_id=data["product"].id)
        p2 = PurchaseFactory(buyer_id=buyer.id, product_id=data["product"].id)
        db_session.add_all([p1, p2])
        db_session.commit()
        
        response = client.get(
            f"/api/purchases/{buyer.id}",
            headers=headers,
        )
        
        assert response.status_code == 200
        response_data = response.json()
        assert len(response_data["items"]) == 2
        assert response_data["meta"]["returned"] == 2
    
    def test_list_purchases_other_user_forbidden(self, client, auth_headers, setup_purchase_data):
        """他のユーザーの購入履歴は 403 を返す。"""
        headers, buyer = auth_headers
        
        other_user = UserFactory()
        
        response = client.get(
            f"/api/purchases/{other_user.id}",
            headers=headers,
        )
        
        assert response.status_code == 403


class TestPurchasesPagination:
    """購入履歴のページネーションのテスト。"""
    
    def test_purchase_list_pagination_with_cursor(self, client, db_session, auth_headers, setup_purchase_data):
        """cursor ベースのページネーションが機能することを確認。"""
        headers, buyer = auth_headers
        data = setup_purchase_data
        
        purchases = [
            PurchaseFactory(buyer_id=buyer.id, product_id=data["product"].id)
            for _ in range(5)
        ]
        db_session.add_all(purchases)
        db_session.commit()
        
        response1 = client.get(
            f"/api/purchases/{buyer.id}?limit=2",
            headers=headers,
        )
        
        assert response1.status_code == 200
        data1 = response1.json()
        assert len(data1["items"]) == 2
        assert data1["meta"]["has_more"] is True
        assert data1["meta"]["next_cursor"] is not None
        
        cursor = data1["meta"]["next_cursor"]
        response2 = client.get(
            f"/api/purchases/{buyer.id}?cursor={cursor}&limit=2",
            headers=headers,
        )
        
        assert response2.status_code == 200
        data2 = response2.json()
        assert len(data2["items"]) == 2
        
        ids1 = {p["id"] for p in data1["items"]}
        ids2 = {p["id"] for p in data2["items"]}
        assert ids1.isdisjoint(ids2)
