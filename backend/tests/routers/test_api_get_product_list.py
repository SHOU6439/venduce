import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.brand import Brand
from app.models.category import Category
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

def test_list_products_sort_other_fields(client: TestClient, products_fixture):
    """Sort by title and stock_quantity"""
    response = client.get("/api/products/?sort=title:asc")
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["title"] == "Apple"
    assert data["items"][1]["title"] == "Banana"

    response = client.get("/api/products/?sort=stock_quantity:desc")
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["title"] == "Banana"
    assert data["items"][1]["title"] == "Apple"

def test_list_products_sort_invalid(client: TestClient, products_fixture):
    """Invalid sort field defaults to created_at (desc)"""
    response = client.get("/api/products/?sort=invalid_field:asc")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2

def test_list_products_admin_sees_all(client: TestClient, db_session, products_fixture):
    """Admin sees all products including drafts by default if no status filter provided (or logic allows)"""
    user = UserFactory(is_admin=True)
    db_session.commit()
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
    db_session.commit()
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

def test_list_products_admin_no_cache(client: TestClient, db_session, products_fixture):
    """Admin requests should not be cached"""
    user = UserFactory(is_admin=True)
    db_session.commit()
    from app.utils.jwt import create_access_token
    token, _ = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/products/", headers=headers)
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"

def test_list_products_price_filter(client: TestClient, products_fixture):
    """Filter by price range"""
    response = client.get("/api/products/?price_min=60")
    assert response.status_code == 200
    data = response.json()
    titles = [item["title"] for item in data["items"]]
    assert "Apple" in titles
    assert "Banana" not in titles

    response = client.get("/api/products/?price_max=90")
    assert response.status_code == 200
    data = response.json()
    titles = [item["title"] for item in data["items"]]
    assert "Banana" in titles
    assert "Apple" not in titles

def test_list_products_category_brand_filter(client: TestClient, db_session: Session):
    """Filter by category and brand"""
    brand1 = Brand(name="BrandA", slug="brand-a")
    brand2 = Brand(name="BrandB", slug="brand-b")
    cat1 = Category(name="CatA", slug="cat-a")
    cat2 = Category(name="CatB", slug="cat-b")
    db_session.add_all([brand1, brand2, cat1, cat2])
    db_session.commit()

    p1 = Product(title="P1", sku="S1", price_cents=100, status="published", brand_id=brand1.id)
    p2 = Product(title="P2", sku="S2", price_cents=100, status="published", brand_id=brand2.id)
    p3 = Product(title="P3", sku="S3", price_cents=100, status="published", brand_id=brand1.id)

    db_session.add_all([p1, p2, p3])

    p1.categories.append(cat1)
    p2.categories.append(cat2)
    p3.categories.append(cat2)

    db_session.commit()

    response = client.get("/api/products/?brand=brand-a")
    assert response.status_code == 200
    data = response.json()
    titles = sorted([item["title"] for item in data["items"]])
    assert titles == ["P1", "P3"]

    response = client.get("/api/products/?category=cat-b")
    assert response.status_code == 200
    data = response.json()
    titles = sorted([item["title"] for item in data["items"]])
    assert titles == ["P2", "P3"]

    response = client.get("/api/products/?brand=brand-a&category=cat-b")
    assert response.status_code == 200
    data = response.json()
    titles = [item["title"] for item in data["items"]]
    assert titles == ["P3"]

def test_list_products_pagination(client: TestClient, db_session: Session):
    """Pagination returns correct items and metadata"""
    products = [
        Product(title=f"P{i}", sku=f"SKU{i}", price_cents=100+i, status="published", stock_quantity=10)
        for i in range(5)
    ]
    db_session.add_all(products)
    db_session.commit()

    response = client.get("/api/products/?per_page=2&page=1")
    assert response.status_code == 200
    data = response.json()
    assert data["per_page"] == 2
    assert data["page"] == 1
    assert data["total"] >= 5
    assert data["total_pages"] >= 3
    assert len(data["items"]) == 2

    response = client.get("/api/products/?per_page=2&page=2")
    assert response.status_code == 200
    data2 = response.json()
    assert data2["per_page"] == 2
    assert data2["page"] == 2
    assert len(data2["items"]) == 2
    ids_page1 = {item["sku"] for item in data["items"]}
    ids_page2 = {item["sku"] for item in data2["items"]}
    assert ids_page1.isdisjoint(ids_page2)

    response = client.get("/api/products/?per_page=100&page=1")
    assert response.status_code == 200
    data = response.json()
    assert data["per_page"] == 100
    assert data["page"] == 1
    assert len(data["items"]) == data["total"]
