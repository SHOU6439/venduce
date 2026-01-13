"""投稿詳細取得 API の統合テスト"""
from fastapi import status
from sqlalchemy.orm import Session
from tests.factories.post_factory import PostFactory
from tests.factories.user import UserFactory
from app.models.enums import PostStatus


def test_get_post_detail_public_success(client, db_session: Session, test_user):
    """公開投稿の詳細取得（認証なし）"""
    post = PostFactory(user_id=test_user.id, status=PostStatus.PUBLIC, caption="Public post")
    db_session.add(post)
    db_session.commit()

    response = client.get(f"/api/posts/{post.id}")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == post.id
    assert data["caption"] == "Public post"
    assert data["status"] == "public"
    assert data["is_liked"] is False
    assert "user" in data
    assert data["user"]["id"] == test_user.id


def test_get_post_detail_public_with_auth(authorized_client, db_session: Session, test_user):
    """公開投稿の詳細取得（認証あり）"""
    post = PostFactory(user_id=test_user.id, status=PostStatus.PUBLIC)
    db_session.add(post)
    db_session.commit()

    response = authorized_client.get(f"/api/posts/{post.id}")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == post.id
    assert data["is_liked"] is False


def test_get_post_detail_draft_owner_success(authorized_client, db_session: Session, test_user):
    """下書き投稿を投稿者本人が取得（成功）"""
    post = PostFactory(user_id=test_user.id, status=PostStatus.DRAFT, caption="Draft post")
    db_session.add(post)
    db_session.commit()

    response = authorized_client.get(f"/api/posts/{post.id}")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == post.id
    assert data["caption"] == "Draft post"
    assert data["status"] == "draft"


def test_get_post_detail_draft_other_user_forbidden(client, db_session: Session, test_user):
    """下書き投稿を他ユーザーが取得（403）"""
    other_user = UserFactory()
    db_session.add(other_user)
    db_session.commit()

    post = PostFactory(user_id=other_user.id, status=PostStatus.DRAFT)
    db_session.add(post)
    db_session.commit()

    from app.utils.jwt import create_access_token
    token, _ = create_access_token(subject=test_user.id)
    client.headers = {
        **client.headers,
        "Authorization": f"Bearer {token}"
    }

    response = client.get(f"/api/posts/{post.id}")

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "permission" in response.json()["detail"].lower()


def test_get_post_detail_draft_unauthenticated_forbidden(client, db_session: Session, test_user):
    """下書き投稿を未認証ユーザーが取得（403）"""
    post = PostFactory(user_id=test_user.id, status=PostStatus.DRAFT)
    db_session.add(post)
    db_session.commit()

    response = client.get(f"/api/posts/{post.id}")

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_get_post_detail_not_found(client):
    """存在しない投稿（404）"""
    response = client.get("/api/posts/non-existent-id")

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "not found" in response.json()["detail"].lower()


def test_get_post_detail_archived_owner_success(authorized_client, db_session: Session, test_user):
    """アーカイブ投稿を投稿者本人が取得（成功）"""
    post = PostFactory(user_id=test_user.id, status=PostStatus.ARCHIVED)
    db_session.add(post)
    db_session.commit()

    response = authorized_client.get(f"/api/posts/{post.id}")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "archived"


def test_get_post_detail_archived_other_user_forbidden(client, db_session: Session, test_user):
    """アーカイブ投稿を他ユーザーが取得（403）"""
    other_user = UserFactory()
    db_session.add(other_user)
    db_session.commit()

    post = PostFactory(user_id=other_user.id, status=PostStatus.ARCHIVED)
    db_session.add(post)
    db_session.commit()

    from app.utils.jwt import create_access_token
    token, _ = create_access_token(subject=test_user.id)
    client.headers = {
        **client.headers,
        "Authorization": f"Bearer {token}"
    }

    response = client.get(f"/api/posts/{post.id}")

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_get_post_detail_includes_relations(client, db_session: Session, test_user):
    """投稿詳細が関連データを含むことを確認"""
    from tests.factories.asset_factory import AssetFactory
    from app.models.product import Product

    asset = AssetFactory(owner_id=test_user.id)
    product = Product(
        title="Test Product",
        sku="TEST-SKU-001",
        price_cents=10000,
        currency="JPY",
        status="published"
    )
    db_session.add_all([asset, product])
    db_session.commit()

    post = PostFactory(
        user_id=test_user.id,
        status=PostStatus.PUBLIC,
        caption="Post with relations"
    )
    db_session.add(post)
    db_session.flush()

    post.assets.append(asset)
    post.products.append(product)
    db_session.commit()

    response = client.get(f"/api/posts/{post.id}")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "user" in data
    assert "images" in data or "assets" in data
    assert "products" in data
    assert "tags" in data
