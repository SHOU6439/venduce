from app.services.user_service import UserAlreadyExists


def test_register_api_success(client):
    payload = {
        "email": "apiuser@example.com",
        "username": "apiuser",
        "password": "strongpassword",
        "first_name": "Api",
        "last_name": "User",
    }
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 202
    data = resp.json()
    assert "confirmation_token" in data
    assert isinstance(data["confirmation_token"], str) and data["confirmation_token"]


def test_register_and_confirm_flow(client):
    payload = {
        "email": "apiconfirm@example.com",
        "username": "apiconfirm",
        "password": "strongpassword",
        "first_name": "Api",
        "last_name": "Confirm",
    }
    r = client.post("/api/auth/register", json=payload)
    assert r.status_code == 202
    token = r.json().get("confirmation_token")
    assert token

    r2 = client.post("/api/auth/confirm", params={"token": token})
    assert r2.status_code == 200
    data = r2.json()
    assert data["email"] == payload["email"]


def test_register_api_conflict(client):
    payload = {
        "email": "conflict@example.com",
        "username": "conflict",
        "password": "strongpassword",
        "first_name": "Con",
        "last_name": "Flict",
    }
    r1 = client.post("/api/auth/register", json=payload)
    assert r1.status_code == 202
    r2 = client.post("/api/auth/register", json=payload)
    assert r2.status_code == 409
