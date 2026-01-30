from fastapi import status
from sqlalchemy.orm import Session
from app.models.post import Post
from app.models.asset import Asset
from tests.factories.asset_factory import AssetFactory
from tests.factories.product_factory import ProductFactory


def test_create_post_success(client, db_session: Session, authorized_client, test_user):

    asset = AssetFactory(owner_id=test_user.id)
    db_session.add(asset)
    db_session.commit()

    payload = {
        "caption": "My awesome new shoes!",
        "asset_product_pairs": [{"asset_id": asset.id, "product_id": None}],
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

    # PostAsset テーブルを確認
    from app.models.post_assets import PostAsset
    post_assets = db_session.query(PostAsset).filter(PostAsset.post_id == post.id).all()
    assert len(post_assets) == 1
    assert post_assets[0].asset_id == asset.id


def test_create_post_asset_not_found(authorized_client):
    payload = {
        "caption": "Fail",
        "asset_product_pairs": [{"asset_id": "non-existent-id", "product_id": None}],
        "tags": []
    }
    response = authorized_client.post("/api/posts", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "not found" in response.json()["detail"].lower()


def test_create_post_asset_duplicates(db_session: Session, authorized_client, test_user):
    asset = AssetFactory(owner_id=test_user.id)
    db_session.add(asset)
    db_session.commit()

    payload = {
        "caption": "Duplicate assets",
        "asset_product_pairs": [
            {"asset_id": asset.id, "product_id": None},
            {"asset_id": asset.id, "product_id": None},
        ],
        "tags": []
    }

    response = authorized_client.post("/api/posts", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "duplicate" in response.json()["detail"].lower()


def test_create_post_unauthorized(client):
    response = client.post("/api/posts", json={})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_create_post_without_images_success(db_session: Session, authorized_client, test_user):
    payload = {
        "caption": "No images here",
        "tags": ["misc"],
        "asset_product_pairs": [],
    }

    response = authorized_client.post("/api/posts", json=payload)

    assert response.status_code == status.HTTP_201_CREATED, response.text
    data = response.json()
    assert data["caption"] == "No images here"
    assert data["user_id"] == test_user.id
    assert isinstance(data.get("images"), list)
    assert len(data.get("images")) == 0

    db_session.expire_all()
    post = db_session.query(Post).filter(Post.id == data["id"]).first()
    assert post is not None

    # PostAsset テーブルは空であるべき
    from app.models.post_assets import PostAsset
    post_assets = db_session.query(PostAsset).filter(PostAsset.post_id == post.id).all()
    assert len(post_assets) == 0


def test_create_post_with_asset_linked_to_product(db_session: Session, authorized_client, test_user):
    asset = AssetFactory(owner_id=test_user.id)
    product = ProductFactory(status="published")
    db_session.add_all([asset, product])
    db_session.commit()

    payload = {
        "caption": "Link product",
        "asset_product_pairs": [{"asset_id": asset.id, "product_id": product.id}],
        "tags": []
    }

    response = authorized_client.post("/api/posts", json=payload)
    assert response.status_code == status.HTTP_201_CREATED, response.text

    data = response.json()

    db_session.expire_all()
    from app.models.post_assets import PostAsset
    post_assets = db_session.query(PostAsset).filter(PostAsset.post_id == data["id"]).all()
    assert len(post_assets) == 1
    assert post_assets[0].asset_id == asset.id
    assert post_assets[0].product_id == product.id

    asset_products = data.get("asset_products") or []
    assert len(asset_products) == 1
    ap = asset_products[0]
    assert ap["asset"]["id"] == asset.id
    assert ap["product"] is not None
    assert ap["product"]["id"] == product.id
    assert ap["product"]["title"] == product.title


def test_create_post_asset_pair_with_nonexistent_product(authorized_client, db_session: Session, test_user):
    asset = AssetFactory(owner_id=test_user.id)
    db_session.add(asset)
    db_session.commit()

    payload = {
        "caption": "Nonexistent product",
        "asset_product_pairs": [{"asset_id": asset.id, "product_id": "non-existent-product"}],
        "tags": []
    }

    response = authorized_client.post("/api/posts", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "not found" in response.json()["detail"].lower()
