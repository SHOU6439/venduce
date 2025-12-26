from fastapi import status
from sqlalchemy.orm import Session
from app.models.post import Post

from app.models.asset import Asset

from tests.factories.asset_factory import AssetFactory


def test_create_post_success(client, db_session: Session, authorized_client, test_user):

    asset = AssetFactory(owner_id=test_user.id)
    db_session.add(asset)
    db_session.commit()

    payload = {
        "caption": "My awesome new shoes!",
        "asset_ids": [asset.id],
        "tags": ["Shows", "Fashion", "Summer"],
        "status": "public"
    }

    response = authorized_client.post("/api/posts", json=payload)

    assert response.status_code == status.HTTP_201_CREATED, response.text
    data = response.json()
    assert data["caption"] == "My awesome new shoes!"
    assert len(data["tags"]) == 3
    assert data["user_id"] == test_user.id

    db_session.expire_all()
    post = db_session.query(Post).filter(Post.id == data["id"]).first()
    assert post is not None
    assert len(post.tags) == 3

    tag_names = {t.name for t in post.tags}
    assert "shows" in tag_names
    assert "fashion" in tag_names

    reloaded_asset = db_session.get(Asset, asset.id)

    assert reloaded_asset.owner_id == test_user.id

    assert len(post.assets) == 1
    assert post.assets[0].id == asset.id


def test_create_post_asset_not_found(authorized_client):
    payload = {
        "caption": "Fail",
        "asset_ids": ["non-existent-id"],
        "tags": []
    }
    response = authorized_client.post("/api/posts", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "not found" in response.json()["detail"]


def test_create_post_unauthorized(client):
    response = client.post("/api/posts", json={})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
