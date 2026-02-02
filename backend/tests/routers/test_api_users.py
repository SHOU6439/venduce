import pytest

@pytest.mark.parametrize(
    "update_data,field",
    [
        ({"bio": "a" * 1001}, "bio"),
        ({"avatar_asset_id": ""}, "avatar_asset_id"),
        ({"avatar_asset_id": "a" * 27}, "avatar_asset_id"),
    ]
)
def test_update_user_profile_validation_error(client, db_session, update_data, field):
    """異常系: bio/avatar_asset_idのmin_length/max_lengthバリデーション違反は422エラー"""
    user = UserFactory(email="valerr@example.com", is_confirmed=True, is_active=True)
    db_session.commit()
    login_resp = client.post("/api/auth/login", json={
        "email": "valerr@example.com",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.patch("/api/users/me", json=update_data, headers=headers)
    assert resp.status_code == 422
    assert field in resp.text
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

    from tests.factories.asset_factory import AssetFactory
    asset = AssetFactory(id="01HZYXJQKZJ8YQ2V7K8Q2V7K8Q", owner_id=user.id)
    db_session.commit()

    update_data = {
        "bio": "Hello, I am a new user.",
        "avatar_asset_id": asset.id
    }
    resp = client.patch("/api/users/me", json=update_data, headers=headers)

    assert resp.status_code == 200
    data = resp.json()
    assert data["bio"] == "Hello, I am a new user."
    assert data["avatar_asset"]["id"] == asset.id

    db_session.refresh(user)
    assert user.bio == "Hello, I am a new user."

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

    resp = client.patch("/api/users/me", json={}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["bio"] == "Old Bio"

def test_update_user_profile_unauthorized(client):
    """異常系: 未認証での更新は 401 エラー"""
    resp = client.patch("/api/users/me", json={"bio": "hacker"})
    assert resp.status_code == 401
