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