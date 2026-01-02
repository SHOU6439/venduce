import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.product import Product
from tests.factories import UserFactory

@pytest.fixture
def products_fixture(db_session: Session):
    p1 = Product(title="Apple", sku="A001", price_cents=100, status="published", stock_quantity=10)
    p2 = Product(title="Banana", sku="B001", price_cents=50, status="published", stock_quantity=20)
    p3 = Product(title="Cherry", sku="C001", price_cents=200, status="draft", stock_quantity=5)
    db_session.add_all([p1, p2, p3])
    db_session.commit()
    return [p1, p2, p3]

def test_list_products_public(client: TestClient, products_fixture):
    """Public user sees only published products"""
    response = client.get("/api/products/")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    titles = [item["title"] for item in data["items"]]
    assert "Apple" in titles
    assert "Banana" in titles
    assert "Cherry" not in titles

def test_list_products_search(client: TestClient, products_fixture):
    """Search by query string"""
    response = client.get("/api/products/?q=app")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Apple"

def test_list_products_sort_price(client: TestClient, products_fixture):
    """Sort by price ascending"""
    response = client.get("/api/products/?sort=price_cents:asc")
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["title"] == "Banana"
    assert data["items"][1]["title"] == "Apple"

def test_list_products_admin_sees_all(client: TestClient, db_session, products_fixture):
    """Admin sees all products including drafts by default if no status filter provided (or logic allows)"""
    user = UserFactory(is_admin=True)
    from app.utils.jwt import create_access_token
    token, _ = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/products/", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    titles = [item["title"] for item in data["items"]]
    assert "Cherry" in titles

def test_list_products_admin_filter_draft(client: TestClient, db_session, products_fixture):
    """Admin can filter by draft status"""
    user = UserFactory(is_admin=True)
    from app.utils.jwt import create_access_token
    token, _ = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/products/?status=draft", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Cherry"

def test_list_products_cache_headers(client: TestClient, products_fixture):
    """Public requests should have Cache-Control headers"""
    response = client.get("/api/products/")
    assert response.status_code == 200
    assert "Cache-Control" in response.headers
    assert "max-age=60" in response.headers["Cache-Control"]

def test_list_products_admin_no_cache(client: TestClient, products_fixture):
    """Admin requests should not be cached"""
    user = UserFactory(is_admin=True)
    from app.utils.jwt import create_access_token
    token, _ = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/products/", headers=headers)
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
