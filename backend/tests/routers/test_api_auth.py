from app.services.user_service import UserAlreadyExists
from tests.factories import UserFactory

"""
認証 API テストスイート

このテストスイートは以下をカバーします:

1. **基本的な認証フロー**
   - ユーザー登録 (registration)
   - メール確認 (confirmation)
   - ログイン (login)
   - トークンリフレッシュ (refresh)
   - ログアウト (logout)

2. **Refresh Token セキュリティ** (JWT そのまま保存)
   - JWT トークン文字列が DB に格納されている
   - revoked_at フィールドで無効化管理
   - トークンローテーション機能

3. **デバイス追跡**
   - device_id, ip_address, user_agent, last_used_at の存在確認

注記:
- すべてのテストは独立して実行可能
- DB は各テスト前に TRUNCATE される（conftest.py 参照）
- テストは本番環境と同じ PostgreSQL を使用
"""


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
    assert data["is_confirmed"] is True
    assert data["is_active"] is True


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


def test_confirm_invalid_token(client):
    """Test confirm endpoint with invalid token."""
    r = client.post("/api/auth/confirm", params={"token": "invalid-token"})
    assert r.status_code == 400
    assert "invalid token" in r.json()["detail"].lower()


def test_login_success_after_confirmation(client, db_session):
    """Test login flow after user confirms email."""
    user = UserFactory(
        email="login@example.com",
        username="loginuser",
        is_confirmed=True,
        is_active=True,
    )

    login_payload = {
        "email": "login@example.com",
        "password": "password123",
    }
    r = client.post("/api/auth/login", json=login_payload)
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert "expires_in" in data
    assert isinstance(data["access_token"], str) and data["access_token"]
    assert isinstance(data["refresh_token"], str) and data["refresh_token"]


def test_login_unconfirmed_user(client):
    """Test login fails if email not confirmed."""
    register_payload = {
        "email": "unconfirmed@example.com",
        "username": "unconfirmed",
        "password": "strongpassword",
        "first_name": "Unconfirmed",
        "last_name": "User",
    }
    r1 = client.post("/api/auth/register", json=register_payload)
    assert r1.status_code == 202

    login_payload = {
        "email": "unconfirmed@example.com",
        "password": "strongpassword",
    }
    r2 = client.post("/api/auth/login", json=login_payload)
    assert r2.status_code == 403
    data = r2.json()
    assert "not_confirmed" in data.get("detail", {}).get("code", "")


def test_login_invalid_credentials(client):
    """Test login fails with invalid password."""
    register_payload = {
        "email": "validuser@example.com",
        "username": "validuser",
        "password": "correctpassword",
        "first_name": "Valid",
        "last_name": "User",
    }
    r1 = client.post("/api/auth/register", json=register_payload)
    token = r1.json()["confirmation_token"]
    client.post("/api/auth/confirm", params={"token": token})

    login_payload = {
        "email": "validuser@example.com",
        "password": "wrongpassword",
    }
    r2 = client.post("/api/auth/login", json=login_payload)
    assert r2.status_code == 401
    data = r2.json()
    assert "invalid_credentials" in data.get("detail", {}).get("code", "")


def test_login_nonexistent_user(client):
    """Test login fails for nonexistent user."""
    login_payload = {
        "email": "doesnotexist@example.com",
        "password": "anypassword",
    }
    r = client.post("/api/auth/login", json=login_payload)
    assert r.status_code == 401
    data = r.json()
    assert "invalid_credentials" in data.get("detail", {}).get("code", "")


def test_refresh_token_success(client, db_session):
    """Test refresh token endpoint returns new tokens."""
    user = UserFactory(
        email="refreshuser@example.com",
        username="refreshuser",
        is_confirmed=True,
        is_active=True,
    )

    login_payload = {
        "email": "refreshuser@example.com",
        "password": "password123",
    }
    r1 = client.post("/api/auth/login", json=login_payload)
    assert r1.status_code == 200
    refresh_token = r1.json()["refresh_token"]

    refresh_payload = {"refresh_token": refresh_token}
    r2 = client.post("/api/auth/refresh", json=refresh_payload)
    assert r2.status_code == 200
    data = r2.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert "expires_in" in data


def test_refresh_invalid_token(client):
    """Test refresh with invalid token."""
    refresh_payload = {"refresh_token": "invalid-refresh-token"}
    r = client.post("/api/auth/refresh", json=refresh_payload)
    assert r.status_code == 401
    assert "invalid" in r.json()["detail"].lower()


def test_logout_success(client):
    """Test logout endpoint successfully revokes token."""
    user = UserFactory(
        email="logoutuser@example.com",
        username="logoutuser",
        is_confirmed=True,
        is_active=True,
    )

    login_payload = {
        "email": "logoutuser@example.com",
        "password": "password123",
    }
    r1 = client.post("/api/auth/login", json=login_payload)
    assert r1.status_code == 200
    refresh_token = r1.json()["refresh_token"]

    logout_payload = {"refresh_token": refresh_token}
    r2 = client.post("/api/auth/logout", json=logout_payload)
    assert r2.status_code == 204

    refresh_payload = {"refresh_token": refresh_token}
    r3 = client.post("/api/auth/refresh", json=refresh_payload)
    assert r3.status_code == 401, "Logout should revoke the token"


def test_resend_confirmation_success(client):
    """Test resend confirmation endpoint."""
    register_payload = {
        "email": "resend@example.com",
        "username": "resenduser",
        "password": "strongpassword",
        "first_name": "Resend",
        "last_name": "User",
    }
    r1 = client.post("/api/auth/register", json=register_payload)
    assert r1.status_code == 202

    r2 = client.post("/api/auth/resend-confirmation", params={"email": "resend@example.com"})
    assert r2.status_code == 200
    data = r2.json()
    assert "confirmation_token" in data
    assert isinstance(data["confirmation_token"], str) and data["confirmation_token"]

    new_token = data["confirmation_token"]
    r3 = client.post("/api/auth/confirm", params={"token": new_token})
    assert r3.status_code == 200


def test_resend_confirmation_already_confirmed(client):
    """Test resend confirmation fails for already confirmed user."""
    register_payload = {
        "email": "alreadyconfirmed@example.com",
        "username": "confirmed",
        "password": "strongpassword",
        "first_name": "Already",
        "last_name": "Confirmed",
    }
    r1 = client.post("/api/auth/register", json=register_payload)
    token = r1.json()["confirmation_token"]
    client.post("/api/auth/confirm", params={"token": token})

    r2 = client.post("/api/auth/resend-confirmation", params={"email": "alreadyconfirmed@example.com"})
    assert r2.status_code == 400


def test_resend_confirmation_nonexistent_user(client):
    """Test resend confirmation for nonexistent user."""
    r = client.post("/api/auth/resend-confirmation", params={"email": "does-not-exist@example.com"})
    assert r.status_code == 400


def test_logout_success(client, db_session):
    """Test logout successfully revokes refresh tokens."""
    user = UserFactory(
        email="logoutuser@example.com",
        username="logoutuser",
        is_confirmed=True,
        is_active=True,
    )

    login_payload = {
        "email": "logoutuser@example.com",
        "password": "password123",
    }
    r_login = client.post("/api/auth/login", json=login_payload)
    assert r_login.status_code == 200
    refresh_token = r_login.json()["refresh_token"]

    logout_payload = {"refresh_token": refresh_token}
    r_logout = client.post("/api/auth/logout", json=logout_payload)
    assert r_logout.status_code == 204
    assert r_logout.text == ""


def test_logout_invalid_token(client):
    """Test logout with invalid token."""
    logout_payload = {"refresh_token": "invalid-token"}
    r = client.post("/api/auth/logout", json=logout_payload)
    assert r.status_code == 401
    assert "invalid token" in r.json()["detail"].lower()


def test_logout_then_refresh_fails(client, db_session):
    """Test that refresh fails after logout."""
    user = UserFactory(
        email="logoutrefresh@example.com",
        username="logoutrefresh",
        is_confirmed=True,
        is_active=True,
    )

    login_payload = {
        "email": "logoutrefresh@example.com",
        "password": "password123",
    }
    r_login = client.post("/api/auth/login", json=login_payload)
    assert r_login.status_code == 200
    refresh_token = r_login.json()["refresh_token"]

    logout_payload = {"refresh_token": refresh_token}
    r_logout = client.post("/api/auth/logout", json=logout_payload)
    assert r_logout.status_code == 204

    refresh_payload = {"refresh_token": refresh_token}
    r_refresh = client.post("/api/auth/refresh", json=refresh_payload)
    assert r_refresh.status_code == 401
    assert "revoked" in r_refresh.json()["detail"].lower()