"""PostService.get_post_by_id のユニットテスト"""
import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session
from tests.factories.post_factory import PostFactory
from tests.factories.user import UserFactory
from app.models.enums import PostStatus
from app.services.post_service import PostService


def test_get_post_by_id_public_success(db_session: Session, test_user):
    """公開投稿の取得（認証なし）"""
    post = PostFactory(user_id=test_user.id, status=PostStatus.PUBLIC)
    db_session.add(post)
    db_session.commit()

    service = PostService(db_session)
    result = service.get_post_by_id(post_id=post.id, current_user=None)

    assert result.id == post.id
    assert result.status == PostStatus.PUBLIC


def test_get_post_by_id_public_with_user(db_session: Session, test_user):
    """公開投稿の取得（認証あり）"""
    post = PostFactory(user_id=test_user.id, status=PostStatus.PUBLIC)
    db_session.add(post)
    db_session.commit()

    service = PostService(db_session)
    result = service.get_post_by_id(post_id=post.id, current_user=test_user)

    assert result.id == post.id


def test_get_post_by_id_draft_owner_success(db_session: Session, test_user):
    """下書き投稿を投稿者本人が取得（成功）"""
    post = PostFactory(user_id=test_user.id, status=PostStatus.DRAFT)
    db_session.add(post)
    db_session.commit()

    service = PostService(db_session)
    result = service.get_post_by_id(post_id=post.id, current_user=test_user)

    assert result.id == post.id
    assert result.status == PostStatus.DRAFT


def test_get_post_by_id_draft_other_user_forbidden(db_session: Session, test_user):
    """下書き投稿を他ユーザーが取得（403）"""
    other_user = UserFactory()
    db_session.add(other_user)
    db_session.commit()

    post = PostFactory(user_id=other_user.id, status=PostStatus.DRAFT)
    db_session.add(post)
    db_session.commit()

    service = PostService(db_session)
    with pytest.raises(HTTPException) as exc_info:
        service.get_post_by_id(post_id=post.id, current_user=test_user)

    assert exc_info.value.status_code == 403
    assert "permission" in exc_info.value.detail.lower()


def test_get_post_by_id_draft_unauthenticated_forbidden(db_session: Session, test_user):
    """下書き投稿を未認証で取得（403）"""
    post = PostFactory(user_id=test_user.id, status=PostStatus.DRAFT)
    db_session.add(post)
    db_session.commit()

    service = PostService(db_session)
    with pytest.raises(HTTPException) as exc_info:
        service.get_post_by_id(post_id=post.id, current_user=None)

    assert exc_info.value.status_code == 403


def test_get_post_by_id_not_found(db_session: Session):
    """存在しない投稿（404）"""
    service = PostService(db_session)
    with pytest.raises(HTTPException) as exc_info:
        service.get_post_by_id(post_id="non-existent-id", current_user=None)

    assert exc_info.value.status_code == 404
    assert "not found" in exc_info.value.detail.lower()


def test_get_post_by_id_archived_owner_success(db_session: Session, test_user):
    """アーカイブ投稿を投稿者本人が取得（成功）"""
    post = PostFactory(user_id=test_user.id, status=PostStatus.ARCHIVED)
    db_session.add(post)
    db_session.commit()

    service = PostService(db_session)
    result = service.get_post_by_id(post_id=post.id, current_user=test_user)

    assert result.id == post.id
    assert result.status == PostStatus.ARCHIVED


def test_get_post_by_id_archived_other_user_forbidden(db_session: Session, test_user):
    """アーカイブ投稿を他ユーザーが取得（403）"""
    other_user = UserFactory()
    db_session.add(other_user)
    db_session.commit()

    post = PostFactory(user_id=other_user.id, status=PostStatus.ARCHIVED)
    db_session.add(post)
    db_session.commit()

    service = PostService(db_session)
    with pytest.raises(HTTPException) as exc_info:
        service.get_post_by_id(post_id=post.id, current_user=test_user)

    assert exc_info.value.status_code == 403


def test_get_post_by_id_preloads_relations(db_session: Session, test_user):
    """関連データがプリロードされることを確認（N+1回避）"""
    from tests.factories.asset_factory import AssetFactory

    asset = AssetFactory(owner_id=test_user.id)
    db_session.add(asset)
    db_session.commit()

    post = PostFactory(user_id=test_user.id, status=PostStatus.PUBLIC)
    db_session.add(post)
    db_session.flush()

    post.assets.append(asset)
    db_session.commit()

    service = PostService(db_session)
    result = service.get_post_by_id(post_id=post.id, current_user=None)

    assert result.user is not None
    assert len(result.assets) == 1
    assert result.assets[0].id == asset.id
    assert result.products is not None
    assert result.tags is not None
