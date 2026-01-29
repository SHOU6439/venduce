import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.product import Product
from app.utils.cursor import encode_cursor

@pytest.fixture
def cursor_products_fixture(db_session: Session):
    # created_atは自動でnow()、idはULID
    p1 = Product(title="A", sku="CUR1", price_cents=10, status="published", stock_quantity=1)
    p2 = Product(title="B", sku="CUR2", price_cents=20, status="published", stock_quantity=1)
    p3 = Product(title="C", sku="CUR3", price_cents=30, status="published", stock_quantity=1)
    db_session.add_all([p1, p2, p3])
    db_session.commit()
    return [p1, p2, p3]

def test_cursor_pagination_basic(client: TestClient, cursor_products_fixture):
    # 1件目のみ取得
    response = client.get("/api/products/?limit=1")
    assert response.status_code == 200
    data = response.json()
    assert "next_cursor" in data["meta"]
    assert data["meta"]["has_more"] is True
    assert len(data["items"]) == 1
    # next_cursorで次ページ取得
    next_cursor = data["meta"]["next_cursor"]
    response2 = client.get(f"/api/products/?limit=1&cursor={next_cursor}")
    assert response2.status_code == 200
    data2 = response2.json()
    assert len(data2["items"]) == 1
    assert data2["meta"]["has_more"] is True
    # さらに次ページ
    next_cursor2 = data2["meta"]["next_cursor"]
    response3 = client.get(f"/api/products/?limit=1&cursor={next_cursor2}")
    assert response3.status_code == 200
    data3 = response3.json()
    assert len(data3["items"]) == 1
    # 最後はhas_moreがFalse
    assert data3["meta"]["has_more"] is False

def test_cursor_pagination_end(client: TestClient, cursor_products_fixture):
    # limit=2で2件取得→next_cursorで残り1件
    response = client.get("/api/products/?limit=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["meta"]["has_more"] is True
    next_cursor = data["meta"]["next_cursor"]
    response2 = client.get(f"/api/products/?limit=2&cursor={next_cursor}")
    assert response2.status_code == 200
    data2 = response2.json()
    assert len(data2["items"]) == 1
    assert data2["meta"]["has_more"] is False

def test_cursor_pagination_invalid_cursor(client: TestClient):
    # 無効なカーソル
    response = client.get("/api/products/?cursor=invalidcursor&limit=1")
    assert response.status_code == 400
    assert "Invalid cursor" in response.text
