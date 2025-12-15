import pytest
from fastapi import status
from sqlalchemy.orm import Session
from app.models.post import Post
from app.models.tag import Tag
from app.models.asset import Asset
from tests.factories.user import UserFactory
from tests.factories.asset_factory import AssetFactory

# Assuming we have authentication fixtures or helpers
# If not, we'll manually create tokens.
# Looking at other tests would be ideal, but let's try a standard approach.


def test_create_post_success(client, db_session: Session, authorized_client, test_user):
    # 1. Setup Data
    # Create an asset owned by the user
    asset = AssetFactory(owner_id=test_user.id)
    db_session.add(asset)
    db_session.commit()

    # 2. Payload
    payload = {
        "caption": "My awesome new shoes!",
        "asset_ids": [asset.id],
        "tags": ["Shows", "Fashion", "Summer"],
        "status": "public"
    }

    # 3. Request
    response = authorized_client.post("/api/posts", json=payload)

    # 4. Assertions
    assert response.status_code == status.HTTP_201_CREATED, response.text
    data = response.json()
    assert data["caption"] == "My awesome new shoes!"
    assert len(data["tags"]) == 3
    assert data["user_id"] == test_user.id

    # Verify DB
    db_session.expire_all()
    post = db_session.query(Post).filter(Post.id == data["id"]).first()
    assert post is not None
    assert len(post.tags) == 3

    # Check tags normalization
    tag_names = {t.name for t in post.tags}
    assert "shows" in tag_names  # normalized to lowercase? we implemented .strip().lower()
    assert "fashion" in tag_names

    # Check Asset linkage (if we implemented it)
    reloaded_asset = db_session.query(Asset).get(asset.id)
    assert reloaded_asset.owner_id == post.id
    assert reloaded_asset.owner_type == "post"


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
