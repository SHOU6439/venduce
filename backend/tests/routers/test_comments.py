from fastapi import status
from sqlalchemy.orm import Session
from app.models.comment import Comment
from tests.factories.post_factory import PostFactory
from tests.factories.comment_factory import CommentFactory
from tests.factories.asset_factory import AssetFactory
from tests.factories.user import UserFactory


def test_create_comment_success(authorized_client, db_session: Session, test_user):
    post = PostFactory(user_id=test_user.id)
    db_session.add(post)
    db_session.commit()

    payload = {
        "content": "This is a test comment",
    }

    response = authorized_client.post(f"/api/posts/{post.id}/comments", json=payload)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["content"] == payload["content"]
    assert data["post_id"] == post.id
    assert data["user_id"] == test_user.id
    assert data["parent_comment_id"] is None

    comment_in_db = db_session.get(Comment, data["id"])
    assert comment_in_db is not None
    assert comment_in_db.content == payload["content"]


def test_create_reply_comment_success(authorized_client, db_session: Session, test_user):
    post = PostFactory(user_id=test_user.id)
    parent_comment = CommentFactory(post_id=post.id, user_id=test_user.id)
    db_session.add(post)
    db_session.add(parent_comment)
    db_session.commit()

    payload = {
        "content": "This is a reply",
        "parent_comment_id": parent_comment.id
    }

    response = authorized_client.post(f"/api/posts/{post.id}/comments", json=payload)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["content"] == payload["content"]
    assert data["parent_comment_id"] == parent_comment.id

    comment_in_db = db_session.get(Comment, data["id"])
    assert comment_in_db.parent_comment_id == parent_comment.id


def test_create_comment_post_not_found(authorized_client):
    payload = {"content": "test"}
    response = authorized_client.post("/api/posts/non-existent-id/comments", json=payload)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Post not found" in response.json()["detail"]


def test_create_reply_parent_not_found(authorized_client, db_session: Session, test_user):
    post = PostFactory(user_id=test_user.id)
    db_session.add(post)
    db_session.commit()

    payload = {
        "content": "Reply to ghost",
        "parent_comment_id": "non-existent-id"
    }

    response = authorized_client.post(f"/api/posts/{post.id}/comments", json=payload)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Parent comment not found" in response.json()["detail"]


def test_create_reply_parent_diff_post(authorized_client, db_session: Session, test_user):
    post1 = PostFactory(user_id=test_user.id)
    post2 = PostFactory(user_id=test_user.id)
    comment1 = CommentFactory(post_id=post1.id, user_id=test_user.id)

    db_session.add_all([post1, post2, comment1])
    db_session.commit()

    payload = {
        "content": "Cross-post reply",
        "parent_comment_id": comment1.id
    }

    response = authorized_client.post(f"/api/posts/{post2.id}/comments", json=payload)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Parent comment does not belong to this post" in response.json()["detail"]


def test_create_comment_unauthorized(client):
    response = client.post("/api/posts/some-id/comments", json={"content": "test"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_comments_success(client, db_session: Session, test_user):
    post = PostFactory(user_id=test_user.id)
    db_session.add(post)
    db_session.commit()
    comments = CommentFactory.create_batch(3, post_id=post.id, user_id=test_user.id)

    response = client.get(f"/api/posts/{post.id}/comments")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 3
    content_set = {c.content for c in comments}
    response_content_set = {c["content"] for c in data}
    assert content_set == response_content_set


def test_get_comments_nested_replies(client, db_session: Session, test_user):
    post = PostFactory(user_id=test_user.id)
    db_session.add(post)
    db_session.commit()

    root = CommentFactory(post_id=post.id, user_id=test_user.id, content="root")
    reply1 = CommentFactory(post_id=post.id, user_id=test_user.id, parent_comment_id=root.id, content="reply1")
    reply2 = CommentFactory(post_id=post.id, user_id=test_user.id, parent_comment_id=reply1.id, content="reply2")

    response = client.get(f"/api/posts/{post.id}/comments")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == root.id
    assert len(data[0]["replies"]) == 1
    assert data[0]["replies"][0]["id"] == reply1.id
    assert len(data[0]["replies"][0]["replies"]) == 1
    assert data[0]["replies"][0]["replies"][0]["id"] == reply2.id


def test_get_comments_pagination(client, db_session: Session, test_user):
    post = PostFactory(user_id=test_user.id)
    db_session.add(post)
    db_session.commit()

    comments = CommentFactory.create_batch(5, post_id=post.id, user_id=test_user.id)

    response = client.get(f"/api/posts/{post.id}/comments?limit=2")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2

    response = client.get(f"/api/posts/{post.id}/comments?limit=2&offset=2")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2
    response = client.get(f"/api/posts/{post.id}/comments?limit=2&offset=4")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1


def test_get_comments_post_not_found(client):
    response = client.get("/api/posts/non-existent-id/comments")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_comment_success(authorized_client, db_session: Session, test_user):
    post = PostFactory(user_id=test_user.id)
    comment = CommentFactory(post_id=post.id, user_id=test_user.id, content="Original")
    db_session.add_all([post, comment])
    db_session.commit()

    payload = {"content": "Updated"}
    response = authorized_client.patch(f"/api/comments/{comment.id}", json=payload)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["content"] == "Updated"
    assert data["id"] == comment.id

    db_session.refresh(comment)
    assert comment.content == "Updated"


def test_update_comment_forbidden(client, db_session: Session, test_user):
    other_user = UserFactory()
    post = PostFactory(user_id=other_user.id)
    comment = CommentFactory(post_id=post.id, user_id=other_user.id, content="Original")
    db_session.add_all([other_user, post, comment])
    db_session.commit()

    from app.utils.jwt import create_access_token
    token, _ = create_access_token(subject=test_user.id)
    client.headers = {"Authorization": f"Bearer {token}"}

    payload = {"content": "Updated"}
    response = client.patch(f"/api/comments/{comment.id}", json=payload)

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_delete_comment_success(authorized_client, db_session: Session, test_user):
    post = PostFactory(user_id=test_user.id)
    comment = CommentFactory(post_id=post.id, user_id=test_user.id)
    db_session.add_all([post, comment])
    db_session.commit()

    response = authorized_client.delete(f"/api/comments/{comment.id}")

    assert response.status_code == status.HTTP_204_NO_CONTENT

    db_session.refresh(comment)
    assert comment.is_deleted is True


def test_delete_comment_cascading(authorized_client, db_session: Session, test_user):
    post = PostFactory(user_id=test_user.id)
    root = CommentFactory(post_id=post.id, user_id=test_user.id)
    child = CommentFactory(post_id=post.id, user_id=test_user.id, parent_comment_id=root.id)
    grandchild = CommentFactory(post_id=post.id, user_id=test_user.id, parent_comment_id=child.id)

    db_session.add_all([post, root, child, grandchild])
    db_session.commit()

    response = authorized_client.delete(f"/api/comments/{root.id}")
    assert response.status_code == status.HTTP_204_NO_CONTENT

    db_session.refresh(root)
    db_session.refresh(child)
    db_session.refresh(grandchild)

    assert root.is_deleted is True
    assert child.is_deleted is True
    assert grandchild.is_deleted is True


def test_get_comments_exclude_deleted(client, db_session: Session, test_user):
    post = PostFactory(user_id=test_user.id)

    alive_root = CommentFactory(post_id=post.id, user_id=test_user.id, content="Alive")
    deleted_root = CommentFactory(post_id=post.id, user_id=test_user.id, content="Deleted", is_deleted=True)

    root_with_deleted_child = CommentFactory(post_id=post.id, user_id=test_user.id, content="Parent")
    deleted_child = CommentFactory(post_id=post.id, user_id=test_user.id,
                                   parent_comment_id=root_with_deleted_child.id, is_deleted=True)

    db_session.add_all([post, alive_root, deleted_root, root_with_deleted_child, deleted_child])
    db_session.commit()

    response = client.get(f"/api/posts/{post.id}/comments")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert len(data) == 2

    contents = {c["content"] for c in data}
    assert "Alive" in contents
    assert "Parent" in contents
    assert "Deleted" not in contents

    parent_node = next(c for c in data if c["content"] == "Parent")
    assert len(parent_node["replies"]) == 0


def test_create_comment_max_depth_reparenting(authorized_client, db_session: Session, test_user):
    post = PostFactory(user_id=test_user.id)
    root = CommentFactory(post_id=post.id, user_id=test_user.id)
    child = CommentFactory(post_id=post.id, user_id=test_user.id, parent_comment_id=root.id)
    grandchild = CommentFactory(post_id=post.id, user_id=test_user.id, parent_comment_id=child.id)
    great_grandchild = CommentFactory(post_id=post.id, user_id=test_user.id, parent_comment_id=grandchild.id)

    db_session.add_all([post, root, child, grandchild, great_grandchild])
    db_session.commit()

    payload = {"content": "Reply to GreatGrandChild", "parent_comment_id": great_grandchild.id}
    response = authorized_client.post(f"/api/posts/{post.id}/comments", json=payload)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    assert data["parent_comment_id"] == grandchild.id
    assert data["parent_comment_id"] != great_grandchild.id
    new_comment_id = data["id"]
    new_comment = db_session.get(Comment, new_comment_id)
    assert new_comment.parent_comment_id == grandchild.id
