import pytest
from tests.factories import UserFactory


def _create_admin_token(client, email="admin@example.com"):
    user = UserFactory(email=email, is_confirmed=True, is_active=True, is_admin=True)
    resp = client.post('/api/auth/login', json={'email': email, 'password': 'password123'})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_admin_create_category_success(client, db_session):
    token = _create_admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "name": "Electronics",
        "slug": "electronics",
        "description": "Devices and gadgets",
    }
    r = client.post('/admin/categories/', json=payload, headers=headers)
    assert r.status_code == 201
    data = r.json()
    assert data['slug'] == 'electronics'
    assert data['name'] == 'Electronics'


def test_non_admin_cannot_create_category(client, db_session):
    UserFactory(email='normal@example.com', is_confirmed=True, is_active=True, is_admin=False)
    r_login = client.post('/api/auth/login', json={'email': 'normal@example.com', 'password': 'password123'})
    assert r_login.status_code == 200
    token = r_login.json()['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": "Toys", "slug": "toys"}
    r = client.post('/admin/categories/', json=payload, headers=headers)
    assert r.status_code == 403


def test_duplicate_slug_conflict(client, db_session):
    token = _create_admin_token(client, email='admin2@example.com')
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": "Clothing", "slug": "clothing"}
    r1 = client.post('/admin/categories/', json=payload, headers=headers)
    assert r1.status_code == 201
    r2 = client.post('/admin/categories/', json=payload, headers=headers)
    assert r2.status_code == 409


def test_public_list_and_get(client, db_session):
    token = _create_admin_token(client, email='admin3@example.com')
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": "Books", "slug": "books"}
    r = client.post('/admin/categories/', json=payload, headers=headers)
    assert r.status_code == 201

    r_list = client.get('/api/categories/')
    assert r_list.status_code == 200
    data = r_list.json()
    assert any(c['slug'] == 'books' for c in data)

    r_get = client.get('/api/categories/books')
    assert r_get.status_code == 200
    assert r_get.json()['slug'] == 'books'


def test_get_nonexistent_returns_404(client, db_session):
    r = client.get('/api/categories/no-such-category')
    assert r.status_code == 404


def test_inactive_category_not_listed_and_get_404(client, db_session):
    token = _create_admin_token(client, email='admin_inactive@example.com')
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": "Hidden", "slug": "hidden", "is_active": False}
    r = client.post('/admin/categories/', json=payload, headers=headers)
    assert r.status_code == 201

    r_list = client.get('/api/categories/')
    assert r_list.status_code == 200
    data = r_list.json()
    assert not any(c['slug'] == 'hidden' for c in data)

    r_get = client.get('/api/categories/hidden')
    assert r_get.status_code == 404
