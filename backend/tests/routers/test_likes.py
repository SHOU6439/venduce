from fastapi import status
from tests.factories import PostFactory, UserFactory


def test_create_like(authorized_client, test_user, db_session):
    other_user = UserFactory()
    post = PostFactory(user=other_user)
    db_session.commit()
    response = authorized_client.post(f"/api/posts/{post.id}/likes")
    assert response.status_code == status.HTTP_201_CREATED

    db_session.refresh(post)
    assert post.like_count == 1


def test_create_like_idempotency(authorized_client, test_user, db_session):
    other_user = UserFactory()
    post = PostFactory(user=other_user)
    db_session.commit()

    response = authorized_client.post(f"/api/posts/{post.id}/likes")
    assert response.status_code == status.HTTP_201_CREATED

    response = authorized_client.post(f"/api/posts/{post.id}/likes")
    assert response.status_code == status.HTTP_204_NO_CONTENT

    db_session.refresh(post)
    assert post.like_count == 1


def test_delete_like(authorized_client, test_user, db_session):
    other_user = UserFactory()
    post = PostFactory(user=other_user)
    db_session.commit()

    authorized_client.post(f"/api/posts/{post.id}/likes")

    db_session.refresh(post)
    assert post.like_count == 1

    response = authorized_client.delete(f"/api/posts/{post.id}/likes")
    assert response.status_code == status.HTTP_204_NO_CONTENT

    db_session.refresh(post)
    assert post.like_count == 0


def test_delete_like_idempotency(authorized_client, test_user, db_session):
    other_user = UserFactory()
    post = PostFactory(user=other_user)
    db_session.commit()

    response = authorized_client.delete(f"/api/posts/{post.id}/likes")
    assert response.status_code == status.HTTP_204_NO_CONTENT

    db_session.refresh(post)
    assert post.like_count == 0


def test_like_not_found(authorized_client, db_session):
    response = authorized_client.post("/api/posts/01HXX/likes")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_create_like_unauthorized(client, db_session):
    other_user = UserFactory()
    post = PostFactory(user=other_user)
    db_session.commit()

    response = client.post(f"/api/posts/{post.id}/likes")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
