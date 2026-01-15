"""支払い方法APIエンドポイントのテスト。"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.enums import PaymentType
from app.utils.jwt import create_access_token
from tests.factories import UserFactory, PaymentMethodFactory


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
def auth_headers(db_session):
    """テスト用ユーザーの認証ヘッダーを生成します。"""
    user = UserFactory(is_active=True, is_confirmed=True)
    db_session.add(user)
    db_session.commit()
    
    token, _ = create_access_token(user.id)
    return {"Authorization": f"Bearer {token}"}, user


class TestPaymentMethodsCreate:
    """支払い方法作成のテスト。"""
    
    def test_create_payment_method_success(self, client, auth_headers):
        """正常に支払い方法を作成できることを確認。"""
        headers, user = auth_headers
        
        payload = {
            "payment_type": "credit_card",
            "name": "My Visa Card",
            "details": {"last4": "1234", "brand": "Visa"},
        }
        
        response = client.post(
            "/api/payment-methods",
            json=payload,
            headers=headers,
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["payment_type"] == "credit_card"
        assert data["name"] == "My Visa Card"
        assert data["user_id"] == user.id
        assert data["is_default"] is False
    
    def test_create_payment_method_without_auth(self, client):
        """認証なしでリクエストすると 401 を返す。"""
        payload = {
            "payment_type": "credit_card",
            "name": "My Visa Card",
        }
        
        response = client.post("/api/payment-methods", json=payload)
        assert response.status_code == 401


class TestPaymentMethodsList:
    """支払い方法一覧取得のテスト。"""
    
    def test_list_payment_methods_empty(self, client, auth_headers):
        """支払い方法がない場合、空リストを返す。"""
        headers, user = auth_headers
        
        response = client.get("/api/payment-methods", headers=headers)
        
        assert response.status_code == 200
        assert response.json() == []
    
    def test_list_payment_methods_multiple(self, client, db_session, auth_headers):
        """複数の支払い方法を一覧表示できることを確認。"""
        headers, user = auth_headers
        
        # Create multiple payment methods
        pm1 = PaymentMethodFactory(user_id=user.id, payment_type=PaymentType.CREDIT_CARD)
        pm2 = PaymentMethodFactory(user_id=user.id, payment_type=PaymentType.BANK_TRANSFER)
        db_session.add_all([pm1, pm2])
        db_session.commit()
        
        response = client.get("/api/payment-methods", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert any(p["id"] == pm1.id for p in data)
        assert any(p["id"] == pm2.id for p in data)


class TestPaymentMethodsGet:
    """支払い方法取得のテスト。"""
    
    def test_get_payment_method_success(self, client, db_session, auth_headers):
        """特定の支払い方法を取得できることを確認。"""
        headers, user = auth_headers
        
        pm = PaymentMethodFactory(user_id=user.id)
        db_session.add(pm)
        db_session.commit()
        
        response = client.get(f"/api/payment-methods/{pm.id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == pm.id
        assert data["name"] == pm.name
    
    def test_get_payment_method_not_found(self, client, auth_headers):
        """存在しない支払い方法は 404 を返す。"""
        headers, user = auth_headers
        
        response = client.get("/api/payment-methods/invalid_id", headers=headers)
        
        assert response.status_code == 404
    
    def test_get_payment_method_not_owner(self, client, db_session, auth_headers):
        """他のユーザーの支払い方法にアクセスすると 404 を返す。"""
        headers, user = auth_headers
        
        other_user = UserFactory()
        db_session.add(other_user)
        db_session.commit()
        
        pm = PaymentMethodFactory(user_id=other_user.id)
        db_session.add(pm)
        db_session.commit()
        
        response = client.get(f"/api/payment-methods/{pm.id}", headers=headers)
        
        assert response.status_code == 404


class TestPaymentMethodsUpdate:
    """支払い方法更新のテスト。"""
    
    def test_update_payment_method_name(self, client, db_session, auth_headers):
        """支払い方法の名前を更新できることを確認。"""
        headers, user = auth_headers
        
        pm = PaymentMethodFactory(user_id=user.id, name="Old Name")
        db_session.add(pm)
        db_session.commit()
        
        payload = {"name": "New Name"}
        response = client.patch(
            f"/api/payment-methods/{pm.id}",
            json=payload,
            headers=headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
    
    def test_update_payment_method_set_default(self, client, db_session, auth_headers):
        """デフォルトフラグを設定できることを確認。"""
        headers, user = auth_headers
        
        pm1 = PaymentMethodFactory(user_id=user.id, is_default=False)
        pm2 = PaymentMethodFactory(user_id=user.id, is_default=False)
        db_session.add_all([pm1, pm2])
        db_session.commit()
        
        payload = {"is_default": True}
        response = client.patch(
            f"/api/payment-methods/{pm1.id}",
            json=payload,
            headers=headers,
        )
        
        assert response.status_code == 200
        
        db_session.refresh(pm1)
        db_session.refresh(pm2)
        assert pm1.is_default is True
        assert pm2.is_default is False


class TestPaymentMethodsDelete:
    """支払い方法削除のテスト。"""
    
    def test_delete_payment_method_success(self, client, db_session, auth_headers):
        """支払い方法を削除できることを確認。"""
        headers, user = auth_headers
        
        pm = PaymentMethodFactory(user_id=user.id)
        db_session.add(pm)
        db_session.commit()
        
        pm_id = pm.id
        response = client.delete(f"/api/payment-methods/{pm_id}", headers=headers)
        
        assert response.status_code == 204
        
        from app.models.payment_method import PaymentMethod
        deleted_pm = db_session.query(PaymentMethod).filter_by(id=pm_id).first()
        assert deleted_pm is None
    
    def test_delete_payment_method_not_owner(self, client, db_session, auth_headers):
        """他のユーザーの支払い方法を削除できない。"""
        headers, user = auth_headers
        
        other_user = UserFactory()
        db_session.add(other_user)
        db_session.commit()
        
        pm = PaymentMethodFactory(user_id=other_user.id)
        db_session.add(pm)
        db_session.commit()
        
        response = client.delete(f"/api/payment-methods/{pm.id}", headers=headers)
        
        assert response.status_code == 404
