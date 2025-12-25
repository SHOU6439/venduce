import pytest
from app.schemas.product import ProductCreate
from tests.factories import UserFactory
from app.core.config import settings
from pathlib import Path
from app.utils import jwt as jwt_utils
from app.services.product_service import product_service
import json


def _create_admin_token(client, email="admin@example.com"):
    user = UserFactory(email=email, is_confirmed=True, is_active=True, is_admin=True)
    resp = client.post('/api/auth/login', json={'email': email, 'password': 'password123'})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_admin_create_product_success(client, db_session):
    token = _create_admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "title": "New Product",
        "sku": "SKU123",
        "description": "Nice product",
        "price_cents": 1999,
        "currency": "JPY",
        "stock_quantity": 10,
    }
    r = client.post('/admin/products/', json=payload, headers=headers)
    assert r.status_code == 201
    data = r.json()
    assert data['sku'] == 'SKU123'
    assert data['title'] == 'New Product'
    assert data['categories'] == []


def test_non_admin_cannot_create_product(client):
    from tests.factories import UserFactory
    UserFactory(email='normal@example.com', is_confirmed=True, is_active=True, is_admin=False)
    r_login = client.post('/api/auth/login', json={'email': 'normal@example.com', 'password': 'password123'})
    assert r_login.status_code == 200
    token = r_login.json()['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "title": "New Product",
        "sku": "SKU999",
        "price_cents": 1000,
        "currency": "JPY",
        "stock_quantity": 1,
    }
    r = client.post('/admin/products/', json=payload, headers=headers)
    assert r.status_code == 403


def test_duplicate_sku_conflict(client):
    token = _create_admin_token(client, email='admin2@example.com')
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "title": "Product A",
        "sku": "DUPSKU",
        "price_cents": 500,
        "currency": "JPY",
        "stock_quantity": 5,
    }
    r1 = client.post('/admin/products/', json=payload, headers=headers)
    assert r1.status_code == 201
    r2 = client.post('/admin/products/', json=payload, headers=headers)
    assert r2.status_code == 409


def test_admin_create_ignores_client_created_at(client, db_session):
    token = _create_admin_token(client, email='admin3@example.com')
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "title": "New Product With CreatedAt",
        "sku": "SKU9999",
        "price_cents": 1999,
        "currency": "JPY",
        "stock_quantity": 10,
        "created_at": "2000-01-01T00:00:00Z",
    }
    r = client.post('/admin/products/', json=payload, headers=headers)
    assert r.status_code == 201
    data = r.json()
    assert data['sku'] == 'SKU9999'
    # The server should ignore the client-supplied created_at
    assert data.get('created_at') is not None
    assert data.get('created_at') != payload['created_at']


def test_sku_normalization_conflict(client):
    token = _create_admin_token(client, email='admin4@example.com')
    headers = {"Authorization": f"Bearer {token}"}
    payload1 = {
        "title": "Product A",
        "sku": "abc-123",
        "price_cents": 500,
        "currency": "JPY",
        "stock_quantity": 5,
    }
    payload2 = {
        "title": "Product B",
        "sku": "  ABC-123 ",
        "price_cents": 500,
        "currency": "JPY",
        "stock_quantity": 5,
    }
    r1 = client.post('/admin/products/', json=payload1, headers=headers)
    assert r1.status_code == 201
    r2 = client.post('/admin/products/', json=payload2, headers=headers)
    assert r2.status_code == 409
