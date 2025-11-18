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

    # Login
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
    # Create a confirmed user with factory
    user = UserFactory(
        email="refreshuser@example.com",
        username="refreshuser",
        is_confirmed=True,
        is_active=True,
    )

    # Login to get tokens
    login_payload = {
        "email": "refreshuser@example.com",
        "password": "password123",
    }
    r1 = client.post("/api/auth/login", json=login_payload)
    assert r1.status_code == 200
    refresh_token = r1.json()["refresh_token"]

    # Refresh
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


def test_resend_confirmation_success(client):
    """Test resend confirmation endpoint."""
    # Register user
    register_payload = {
        "email": "resend@example.com",
        "username": "resenduser",
        "password": "strongpassword",
        "first_name": "Resend",
        "last_name": "User",
    }
    r1 = client.post("/api/auth/register", json=register_payload)
    assert r1.status_code == 202

    # Resend confirmation
    r2 = client.post("/api/auth/resend-confirmation", params={"email": "resend@example.com"})
    assert r2.status_code == 200
    data = r2.json()
    assert "confirmation_token" in data
    assert isinstance(data["confirmation_token"], str) and data["confirmation_token"]

    # New token should work for confirmation
    new_token = data["confirmation_token"]
    r3 = client.post("/api/auth/confirm", params={"token": new_token})
    assert r3.status_code == 200


def test_resend_confirmation_already_confirmed(client):
    """Test resend confirmation fails for already confirmed user."""
    # Register and confirm user
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

    # Try to resend confirmation (should fail)
    r2 = client.post("/api/auth/resend-confirmation", params={"email": "alreadyconfirmed@example.com"})
    assert r2.status_code == 400


def test_resend_confirmation_nonexistent_user(client):
    """Test resend confirmation for nonexistent user."""
    r = client.post("/api/auth/resend-confirmation", params={"email": "does-not-exist@example.com"})
    assert r.status_code == 400


# ============================================================================
# Token Hash Security Tests
# ============================================================================

def test_refresh_token_revoked_at_null_for_active(client, db_session):
    """Verify that revoked_at is NULL for active tokens."""
    from app.models.refresh_token import RefreshToken
    
    user = UserFactory(
        email="activetoken@example.com",
        username="activetoken",
        is_confirmed=True,
        is_active=True,
    )
    
    login_payload = {
        "email": "activetoken@example.com",
        "password": "password123",
    }
    r1 = client.post("/api/auth/login", json=login_payload)
    assert r1.status_code == 200
    
    # Check DB: revoked_at should be NULL
    db_record = db_session.query(RefreshToken).filter_by(user_id=str(user.id)).first()
    assert db_record is not None
    assert db_record.revoked_at is None, "Active token should have revoked_at = NULL"


def test_refresh_token_sets_revoked_at_on_refresh(client, db_session):
    """Verify that old token gets revoked_at set when refreshed."""
    from app.models.refresh_token import RefreshToken
    from app.utils.timezone import now_utc
    
    user = UserFactory(
        email="refreshrevoke@example.com",
        username="refreshrevoke",
        is_confirmed=True,
        is_active=True,
    )
    
    # Login
    login_payload = {
        "email": "refreshrevoke@example.com",
        "password": "password123",
    }
    r1 = client.post("/api/auth/login", json=login_payload)
    assert r1.status_code == 200
    old_refresh_token = r1.json()["refresh_token"]
    
    # Get old token record
    old_record_initial = db_session.query(RefreshToken).filter_by(user_id=str(user.id)).first()
    assert old_record_initial.revoked_at is None
    old_record_id = old_record_initial.id
    
    # Refresh the token
    refresh_payload = {"refresh_token": old_refresh_token}
    r2 = client.post("/api/auth/refresh", json=refresh_payload)
    assert r2.status_code == 200
    
    # Verify old token now has revoked_at set
    db_session.expire_all()  # Force DB re-query
    old_record_revoked = db_session.query(RefreshToken).filter_by(id=old_record_id).first()
    assert old_record_revoked.revoked_at is not None, "Old token should have revoked_at set after refresh"
    assert old_record_revoked.revoked_at <= now_utc()
    
    # Verify new token has revoked_at = NULL
    new_records = db_session.query(RefreshToken).filter_by(
        user_id=str(user.id),
        revoked_at=None
    ).all()
    assert len(new_records) == 1, "Should have exactly 1 active token after refresh"
    assert new_records[0].id != old_record_id


def test_refresh_token_revoked_cannot_be_reused(client, db_session):
    """Verify that a revoked token cannot be reused."""
    from app.models.refresh_token import RefreshToken
    
    user = UserFactory(
        email="revokedtest@example.com",
        username="revokedtest",
        is_confirmed=True,
        is_active=True,
    )
    
    # Login
    login_payload = {
        "email": "revokedtest@example.com",
        "password": "password123",
    }
    r1 = client.post("/api/auth/login", json=login_payload)
    assert r1.status_code == 200
    refresh_token = r1.json()["refresh_token"]
    
    # Refresh once
    refresh_payload = {"refresh_token": refresh_token}
    r2 = client.post("/api/auth/refresh", json=refresh_payload)
    assert r2.status_code == 200
    
    # Try to use old token again (should fail)
    r3 = client.post("/api/auth/refresh", json=refresh_payload)
    assert r3.status_code == 401, "Revoked token should not be usable"
    assert "revoked" in r3.json()["detail"].lower()


def test_logout_endpoint_sets_revoked_at(client, db_session):
    """Verify that logout endpoint sets revoked_at."""
    from app.models.refresh_token import RefreshToken
    
    user = UserFactory(
        email="logouttest@example.com",
        username="logouttest",
        is_confirmed=True,
        is_active=True,
    )
    
    # Login
    login_payload = {
        "email": "logouttest@example.com",
        "password": "password123",
    }
    r1 = client.post("/api/auth/login", json=login_payload)
    assert r1.status_code == 200
    refresh_token = r1.json()["refresh_token"]
    
    # Verify token is active
    db_record_initial = db_session.query(RefreshToken).filter_by(user_id=str(user.id)).first()
    assert db_record_initial.revoked_at is None
    token_id = db_record_initial.id
    
    # Logout
    logout_payload = {"refresh_token": refresh_token}
    r2 = client.post("/api/auth/logout", json=logout_payload)
    assert r2.status_code == 204  # No content
    
    # Verify token is now revoked
    db_session.expire_all()
    db_record_revoked = db_session.query(RefreshToken).filter_by(id=token_id).first()
    assert db_record_revoked.revoked_at is not None, "Logout should set revoked_at"


def test_refresh_token_stored_in_db(client, db_session):
    """Verify that JWT token string is stored directly in DB (not hashed)."""
    from app.models.refresh_token import RefreshToken
    
    user = UserFactory(
        email="tokenstoretest@example.com",
        username="tokenstoretest",
        is_confirmed=True,
        is_active=True,
    )
    
    login_payload = {
        "email": "tokenstoretest@example.com",
        "password": "password123",
    }
    r1 = client.post("/api/auth/login", json=login_payload)
    assert r1.status_code == 200
    jwt_token = r1.json()["refresh_token"]
    
    # Verify token is stored in DB
    db_record = db_session.query(RefreshToken).filter_by(user_id=str(user.id)).first()
    
    # Verify JWT token string is stored directly
    assert db_record.refresh_token == jwt_token, "JWT token should be stored as-is in DB"
    assert db_record.refresh_token is not None
    # JWT tokens are ~600+ characters
    assert len(db_record.refresh_token) >= 100, "JWT token should be long (~600 chars)"


def test_no_jti_in_db_only_refresh_token(client, db_session):
    """Verify that refresh_token field contains JWT string directly."""
    from app.models.refresh_token import RefreshToken
    
    user = UserFactory(
        email="nojtitestnew@example.com",
        username="nojtitestnew",
        is_confirmed=True,
        is_active=True,
    )
    
    login_payload = {
        "email": "nojtitestnew@example.com",
        "password": "password123",
    }
    r1 = client.post("/api/auth/login", json=login_payload)
    assert r1.status_code == 200
    
    db_record = db_session.query(RefreshToken).filter_by(user_id=str(user.id)).first()
    
    # Verify refresh_token field contains JWT string (not a hash)
    assert hasattr(db_record, 'refresh_token'), "RefreshToken should have refresh_token attribute"
    assert db_record.refresh_token is not None
    # JWT should contain dots (header.payload.signature)
    assert db_record.refresh_token.count('.') == 2, "JWT token should have 3 parts (header.payload.signature)"


def test_refresh_token_has_device_tracking_fields(client, db_session):
    """Verify that device tracking fields are present in RefreshToken."""
    from app.models.refresh_token import RefreshToken
    
    user = UserFactory(
        email="devicetrackingtest@example.com",
        username="devicetrackingtest",
        is_confirmed=True,
        is_active=True,
    )
    
    login_payload = {
        "email": "devicetrackingtest@example.com",
        "password": "password123",
    }
    r1 = client.post("/api/auth/login", json=login_payload)
    assert r1.status_code == 200
    
    db_record = db_session.query(RefreshToken).filter_by(user_id=str(user.id)).first()
    
    # Verify device tracking fields exist
    assert hasattr(db_record, 'device_id'), "RefreshToken should have device_id"
    assert hasattr(db_record, 'ip_address'), "RefreshToken should have ip_address"
    assert hasattr(db_record, 'user_agent'), "RefreshToken should have user_agent"
    assert hasattr(db_record, 'last_used_at'), "RefreshToken should have last_used_at"

