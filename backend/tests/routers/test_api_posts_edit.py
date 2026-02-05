from fastapi import status
from tests.factories import PostFactory, UserFactory, TagFactory


def test_update_post_success(authorized_client, test_user, db_session):
    post = PostFactory(user=test_user, caption="Original Caption")
    db_session.commit()

    payload = {
        "caption": "Updated Caption",
        "tags": ["newtag"]
    }
    response = authorized_client.patch(f"/api/posts/{post.id}", json=payload)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["caption"] == "Updated Caption"
    assert len(data["tags"]) == 1
    assert data["tags"][0]["name"] == "newtag"

    db_session.refresh(post)
    assert post.caption == "Updated Caption"
    assert len(post.tags) == 1
    assert post.tags[0].name == "newtag"


def test_update_post_etag_conflict(authorized_client, test_user, db_session):
    post = PostFactory(user=test_user)
    db_session.commit()

    wrong_etag = "123456789.0"

    payload = {"caption": "New Caption"}
    response = authorized_client.patch(
        f"/api/posts/{post.id}",
        json=payload,
        headers={"if-match": wrong_etag}
    )

    assert response.status_code == status.HTTP_409_CONFLICT

    db_session.refresh(post)
    assert post.caption != "New Caption"


def test_update_post_permission_denied(client, db_session):
    owner = UserFactory()
    post = PostFactory(user=owner)
    db_session.commit()
    other_user = UserFactory()
    from app.utils.jwt import create_access_token
    token, _ = create_access_token(subject=other_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"caption": "Hacked"}
    response = client.patch(f"/api/posts/{post.id}", json=payload, headers=headers)

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_delete_post_success(authorized_client, test_user, db_session):
    post = PostFactory(user=test_user)
    db_session.commit()

    response = authorized_client.delete(f"/api/posts/{post.id}")
    assert response.status_code == status.HTTP_204_NO_CONTENT

    db_session.refresh(post)
    assert post.deleted_at is not None


def test_delete_post_tags_decremented(authorized_client, test_user, db_session):
    tag = TagFactory(name="testtag", usage_count=5)
    post = PostFactory(user=test_user, tags=[tag])
    db_session.commit()

    response = authorized_client.delete(f"/api/posts/{post.id}")
    assert response.status_code == status.HTTP_204_NO_CONTENT

    db_session.refresh(tag)
    assert tag.usage_count == 4


def test_get_post_after_delete_not_found(authorized_client, test_user, db_session):
    post = PostFactory(user=test_user)
    db_session.commit()
    post_id = post.id

    authorized_client.delete(f"/api/posts/{post_id}")

    response = authorized_client.get(f"/api/posts/{post_id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND

    response = authorized_client.get("/api/posts")
    data = response.json()
    ids = [item["id"] for item in data["items"]]
    assert post_id not in ids
