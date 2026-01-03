import pytest
from tests.factories import UserFactory


def _create_admin_token(client, email="admin@example.com"):
    user = UserFactory(email=email, is_confirmed=True, is_active=True, is_admin=True)
    resp = client.post('/api/auth/login', json={'email': email, 'password': 'password123'})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_admin_create_brand_success(client, db_session):
    token = _create_admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "name": "Acme",
        "slug": "acme",
        "description": "Acme brand",
    }
    r = client.post('/admin/brands/', json=payload, headers=headers)
    assert r.status_code == 201
    data = r.json()
    assert data['slug'] == 'acme'
    assert data['name'] == 'Acme'


def test_non_admin_cannot_create_brand(client, db_session):
    UserFactory(email='normal2@example.com', is_confirmed=True, is_active=True, is_admin=False)
    r_login = client.post('/api/auth/login', json={'email': 'normal2@example.com', 'password': 'password123'})
    assert r_login.status_code == 200
    token = r_login.json()['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": "Generic", "slug": "generic"}
    r = client.post('/admin/brands/', json=payload, headers=headers)
    assert r.status_code == 403


def test_duplicate_brand_slug_conflict(client, db_session):
    token = _create_admin_token(client, email='admin4@example.com')
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": "BrandX", "slug": "brandx"}
    r1 = client.post('/admin/brands/', json=payload, headers=headers)
    assert r1.status_code == 201
    r2 = client.post('/admin/brands/', json=payload, headers=headers)
    assert r2.status_code == 409


def test_public_list_and_get_brands(client, db_session):
    token = _create_admin_token(client, email='admin5@example.com')
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": "Zenith", "slug": "zenith"}
    r = client.post('/admin/brands/', json=payload, headers=headers)
    assert r.status_code == 201

    r_list = client.get('/api/brands/')
    assert r_list.status_code == 200
    data = r_list.json()
    assert any(b['slug'] == 'zenith' for b in data)

    r_get = client.get('/api/brands/zenith')
    assert r_get.status_code == 200
    assert r_get.json()['slug'] == 'zenith'


def test_get_nonexistent_brand_returns_404(client, db_session):
    r = client.get('/api/brands/no-such-brand')
    assert r.status_code == 404


def test_inactive_brand_not_listed_and_get_404(client, db_session):
    token = _create_admin_token(client, email='admin_inactive_brand@example.com')
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": "HiddenBrand", "slug": "hiddenbrand", "is_active": False}
    r = client.post('/admin/brands/', json=payload, headers=headers)
    assert r.status_code == 201

    r_list = client.get('/api/brands/')
    assert r_list.status_code == 200
    data = r_list.json()
    assert not any(b['slug'] == 'hiddenbrand' for b in data)

    r_get = client.get('/api/brands/hiddenbrand')
    assert r_get.status_code == 404
