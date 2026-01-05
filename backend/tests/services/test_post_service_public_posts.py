"""Tests for PostService.get_public_posts() method."""
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.services.post_service import PostService
from app.models.enums import PostStatus
from tests.factories.user import UserFactory
from tests.factories.post_factory import PostFactory


def test_get_public_posts_returns_public_only(db_session: Session):
    """Test that get_public_posts returns only public posts."""
    user = UserFactory()
    db_session.add(user)
    db_session.commit()

    # Create various posts
    public_post_1 = PostFactory(user_id=user.id, status=PostStatus.PUBLIC)
    public_post_2 = PostFactory(user_id=user.id, status=PostStatus.PUBLIC)
    draft_post = PostFactory(user_id=user.id, status=PostStatus.DRAFT)
    archived_post = PostFactory(user_id=user.id, status=PostStatus.ARCHIVED)

    db_session.add_all([public_post_1, public_post_2, draft_post, archived_post])
    db_session.commit()

    service = PostService(db_session)
    posts, next_cursor, has_more = service.get_public_posts(limit=10)

    assert len(posts) == 2
    assert all(p.status == PostStatus.PUBLIC for p in posts)
    assert has_more is False
    assert next_cursor is None


def test_get_public_posts_pagination(db_session: Session):
    """Test cursor-based pagination."""
    user = UserFactory()
    db_session.add(user)
    db_session.commit()

    # Create 5 public posts
    posts_created = []
    for _ in range(5):
        post = PostFactory(user_id=user.id, status=PostStatus.PUBLIC)
        db_session.add(post)
        posts_created.append(post)
    db_session.commit()

    service = PostService(db_session)

    # First page (limit=2)
    page1_posts, cursor1, has_more1 = service.get_public_posts(limit=2)

    assert len(page1_posts) == 2
    assert has_more1 is True
    assert cursor1 is not None

    # Second page
    page2_posts, cursor2, has_more2 = service.get_public_posts(cursor=cursor1, limit=2)

    assert len(page2_posts) == 2
    assert has_more2 is True
    assert cursor2 is not None

    # Ensure no overlap
    page1_ids = {p.id for p in page1_posts}
    page2_ids = {p.id for p in page2_posts}
    assert page1_ids.isdisjoint(page2_ids)

    # Third page (last page)
    page3_posts, cursor3, has_more3 = service.get_public_posts(cursor=cursor2, limit=2)

    assert len(page3_posts) == 1
    assert has_more3 is False
    assert cursor3 is None


def test_get_public_posts_ordering(db_session: Session):
    """Test posts are ordered by created_at DESC."""
    user = UserFactory()
    db_session.add(user)
    db_session.commit()

    # Create posts with specific timestamps
    old_post = PostFactory(user_id=user.id, status=PostStatus.PUBLIC)
    old_post.created_at = datetime(2024, 1, 1, tzinfo=timezone.utc)

    new_post = PostFactory(user_id=user.id, status=PostStatus.PUBLIC)
    new_post.created_at = datetime(2024, 12, 31, tzinfo=timezone.utc)

    middle_post = PostFactory(user_id=user.id, status=PostStatus.PUBLIC)
    middle_post.created_at = datetime(2024, 6, 15, tzinfo=timezone.utc)

    db_session.add_all([old_post, new_post, middle_post])
    db_session.commit()

    service = PostService(db_session)
    posts, _, _ = service.get_public_posts(limit=10)

    assert len(posts) == 3
    assert posts[0].id == new_post.id  # Newest first
    assert posts[1].id == middle_post.id
    assert posts[2].id == old_post.id  # Oldest last


def test_get_public_posts_empty(db_session: Session):
    """Test get_public_posts with no posts."""
    service = PostService(db_session)
    posts, next_cursor, has_more = service.get_public_posts(limit=10)

    assert len(posts) == 0
    assert has_more is False
    assert next_cursor is None


def test_get_public_posts_includes_related_data(db_session: Session):
    """Test that related data (user, assets, etc.) are loaded."""
    user = UserFactory()
    db_session.add(user)
    db_session.commit()

    post = PostFactory(user_id=user.id, status=PostStatus.PUBLIC)
    db_session.add(post)
    db_session.commit()

    service = PostService(db_session)
    posts, _, _ = service.get_public_posts(limit=10)

    assert len(posts) == 1
    # Check that relationships are loaded (shouldn't cause additional queries)
    assert posts[0].user is not None
    assert posts[0].user.id == user.id
