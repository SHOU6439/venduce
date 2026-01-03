import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.user import User
from tests.factories import UserFactory

@pytest.fixture
def public_product(db_session: Session) -> Product:
    product = Product(
        title="Public Product",
        sku="PUB-001",
        price_cents=1000,
        stock_quantity=10,
        status="published"
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product

@pytest.fixture
def draft_product(db_session: Session) -> Product:
    product = Product(
        title="Draft Product",
        sku="DRF-001",
        price_cents=2000,
        stock_quantity=5,
        status="draft"
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product

def test_get_product_public_anonymous(
    client: TestClient, public_product: Product
):
    response = client.get(f"/api/products/{public_product.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == public_product.id
    assert data["title"] == public_product.title
    assert response.headers["cache-control"] == "public, max-age=60"

def test_get_product_not_found(client: TestClient):
    response = client.get("/api/products/non-existent-id")
    assert response.status_code == 404

def test_get_product_draft_anonymous(
    client: TestClient, draft_product: Product
):
    response = client.get(f"/api/products/{draft_product.id}")
    assert response.status_code == 404

def test_get_product_draft_superuser(
    client: TestClient, db_session: Session, draft_product: Product
):
    admin_user = UserFactory(is_admin=True)

    from app.utils.jwt import create_access_token
    token, _ = create_access_token(subject=admin_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get(f"/api/products/{draft_product.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["id"] == draft_product.id
    assert response.headers["cache-control"] == "no-store"

def test_list_products_user_cannot_filter_by_status(client, db_session):
    """
    一般ユーザーは status パラメータを指定しても published 以外は見えないことを検証
    """
    from app.models.product import Product
    p1 = Product(title="公開商品", sku="PUB-001", price_cents=1000, stock_quantity=5, status="published")
    p2 = Product(title="下書き商品", sku="DRF-001", price_cents=2000, stock_quantity=5, status="draft")
    db_session.add_all([p1, p2])
    db_session.commit()

    resp = client.get("/api/products/?status=draft")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list) or "items" in data
    items = data if isinstance(data, list) else data["items"]
    assert all(item["status"] == "published" for item in items)