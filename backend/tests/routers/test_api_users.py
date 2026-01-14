from tests.factories import UserFactory

def test_read_user_me_success(client, db_session):
    """正常系: 認証済みユーザーが自分のプロフィールを取得できる"""
    user = UserFactory(email="me@example.com", is_confirmed=True, is_active=True)
    db_session.commit()

    login_payload = {
        "email": "me@example.com",
        "password": "password123",
    }
    login_resp = client.post("/api/auth/login", json=login_payload)
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/users/me", headers=headers)

    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "me@example.com"
    assert data["id"] == user.id
    assert "password" not in data
    assert "password_hash" not in data

def test_read_user_me_unauthorized(client):
    """異常系: 未認証リクエストは 401 エラー"""
    resp = client.get("/api/users/me")
    assert resp.status_code == 401

def test_update_user_profile_success(client, db_session):
    """正常系: ユーザーが自分のプロフィールを更新できる"""
    user = UserFactory(email="update_me@example.com", is_confirmed=True, is_active=True)
    db_session.commit()

    login_resp = client.post("/api/auth/login", json={
        "email": "update_me@example.com",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    update_data = {
        "bio": "Hello, I am a new user.",
        "display_name": "New Display Name",
        "avatar_url": "https://example.com/avatar.png"
    }
    resp = client.patch("/api/users/me", json=update_data, headers=headers)

    assert resp.status_code == 200
    data = resp.json()
    assert data["bio"] == "Hello, I am a new user."
    assert data["display_name"] == "New Display Name"
    assert data["avatar_url"] == "https://example.com/avatar.png"

    db_session.refresh(user)
    assert user.bio == "Hello, I am a new user."
    assert user.display_name == "New Display Name"

def test_update_user_profile_partial(client, db_session):
    """正常系: 部分的な更新が可能"""
    UserFactory(email="partial@example.com", is_confirmed=True, is_active=True, bio="Old Bio")
    db_session.commit()

    login_resp = client.post("/api/auth/login", json={
        "email": "partial@example.com",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.patch("/api/users/me", json={"display_name": "Updated Name"}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["display_name"] == "Updated Name"
    assert data["bio"] == "Old Bio"

def test_update_user_profile_unauthorized(client):
    """異常系: 未認証での更新は 401 エラー"""
    resp = client.patch("/api/users/me", json={"bio": "hacker"})
    assert resp.status_code == 401