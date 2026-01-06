"""Tests for GET /api/posts endpoint."""
from fastapi import status
from sqlalchemy.orm import Session

from app.models.enums import PostStatus
from tests.factories.user import UserFactory
from tests.factories.post_factory import PostFactory


def test_get_posts_success(client, db_session: Session):
    """Test basic GET /api/posts returns public posts."""
    user = UserFactory()
    db_session.add(user)
    db_session.commit()

    # Create public posts
    post1 = PostFactory(user_id=user.id, status=PostStatus.PUBLIC)
    post2 = PostFactory(user_id=user.id, status=PostStatus.PUBLIC)
    db_session.add_all([post1, post2])
    db_session.commit()

    response = client.get("/api/posts")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "items" in data
    assert "meta" in data
    assert len(data["items"]) == 2
    assert data["meta"]["returned"] == 2
    assert data["meta"]["has_more"] is False
    assert data["meta"]["next_cursor"] is None


def test_get_posts_filters_non_public(client, db_session: Session):
    """Test that draft and archived posts are excluded."""
    user = UserFactory()
    db_session.add(user)
    db_session.commit()

    public_post = PostFactory(user_id=user.id, status=PostStatus.PUBLIC)
    draft_post = PostFactory(user_id=user.id, status=PostStatus.DRAFT)
    archived_post = PostFactory(user_id=user.id, status=PostStatus.ARCHIVED)

    db_session.add_all([public_post, draft_post, archived_post])
    db_session.commit()

    response = client.get("/api/posts")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == public_post.id
    assert data["items"][0]["status"] == "public"


def test_get_posts_pagination_limit(client, db_session: Session):
    """Test limit parameter."""
    user = UserFactory()
    db_session.add(user)
    db_session.commit()

    # Create 10 posts
    for _ in range(10):
        post = PostFactory(user_id=user.id, status=PostStatus.PUBLIC)
        db_session.add(post)
    db_session.commit()

    response = client.get("/api/posts?limit=5")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert len(data["items"]) == 5
    assert data["meta"]["returned"] == 5
    assert data["meta"]["has_more"] is True
    assert data["meta"]["next_cursor"] is not None


def test_get_posts_cursor_continuation(client, db_session: Session):
    """Test cursor-based pagination continuation."""
    user = UserFactory()
    db_session.add(user)
    db_session.commit()

    # Create 5 posts
    for _ in range(5):
        post = PostFactory(user_id=user.id, status=PostStatus.PUBLIC)
        db_session.add(post)
    db_session.commit()

    # First page
    response1 = client.get("/api/posts?limit=2")
    assert response1.status_code == status.HTTP_200_OK
    data1 = response1.json()

    assert len(data1["items"]) == 2
    assert data1["meta"]["has_more"] is True
    cursor = data1["meta"]["next_cursor"]

    # Second page
    response2 = client.get(f"/api/posts?limit=2&cursor={cursor}")
    assert response2.status_code == status.HTTP_200_OK
    data2 = response2.json()

    assert len(data2["items"]) == 2
    assert data2["meta"]["has_more"] is True

    # Ensure no overlap
    ids_page1 = {item["id"] for item in data1["items"]}
    ids_page2 = {item["id"] for item in data2["items"]}
    assert ids_page1.isdisjoint(ids_page2)


def test_get_posts_limit_boundaries(client, db_session: Session):
    """Test limit parameter boundary values."""
    user = UserFactory()
    db_session.add(user)
    db_session.commit()

    post = PostFactory(user_id=user.id, status=PostStatus.PUBLIC)
    db_session.add(post)
    db_session.commit()

    # Test minimum limit
    response = client.get("/api/posts?limit=1")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.json()["items"]) == 1

    # Test maximum limit
    response = client.get("/api/posts?limit=100")
    assert response.status_code == status.HTTP_200_OK

    # Test invalid limit (too small)
    response = client.get("/api/posts?limit=0")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Test invalid limit (too large)
    response = client.get("/api/posts?limit=101")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_get_posts_invalid_cursor(client):
    """Test invalid cursor returns 400."""
    response = client.get("/api/posts?cursor=invalid-cursor")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid cursor format" in response.json()["detail"]


def test_get_posts_empty_result(client, db_session: Session):
    """Test empty result when no posts exist."""
    response = client.get("/api/posts")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert len(data["items"]) == 0
    assert data["meta"]["returned"] == 0
    assert data["meta"]["has_more"] is False
    assert data["meta"]["next_cursor"] is None


def test_get_posts_includes_related_data(client, db_session: Session):
    """Test that response includes user, assets, products, tags."""
    user = UserFactory()
    db_session.add(user)
    db_session.commit()

    post = PostFactory(user_id=user.id, status=PostStatus.PUBLIC, caption="Test post")
    db_session.add(post)
    db_session.commit()

    response = client.get("/api/posts")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert len(data["items"]) == 1
    post_data = data["items"][0]

    # Check structure
    assert "user" in post_data
    assert "images" in post_data  # alias for assets
    assert "products" in post_data
    assert "tags" in post_data
    assert post_data["caption"] == "Test post"
    assert post_data["user"]["id"] == user.id
