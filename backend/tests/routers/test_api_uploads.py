from io import BytesIO
import shutil
from pathlib import Path

import pytest
from PIL import Image

from app.core.config import settings
from tests.factories import UserFactory


@pytest.fixture(autouse=True)
def clear_asset_storage():
    root = Path(settings.ASSET_STORAGE_ROOT)
    if root.exists():
        shutil.rmtree(root, ignore_errors=True)
    root.mkdir(parents=True, exist_ok=True)
    yield
    if root.exists():
        shutil.rmtree(root, ignore_errors=True)
    root.mkdir(parents=True, exist_ok=True)


def _create_authenticated_headers(client, db_session, email: str = "uploaduser@example.com") -> dict[str, str]:
    user = UserFactory(email=email, is_confirmed=True, is_active=True)
    db_session.commit()

    resp = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _build_png_bytes() -> BytesIO:
    buffer = BytesIO()
    Image.new("RGB", (16, 16), (255, 0, 0)).save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


def test_upload_image_success(client, db_session):
    headers = _create_authenticated_headers(client, db_session)
    file_bytes = _build_png_bytes()

    resp = client.post(
        "/api/uploads",
        headers=headers,
        data={"purpose": "avatar"},
        files={"file": ("avatar.png", file_bytes, "image/png")},
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["purpose"] == "avatar"
    assert data["content_type"] == "image/png"
    assert data["width"] == 16
    assert data["height"] == 16

    saved_path = Path(settings.ASSET_STORAGE_ROOT) / data["storage_key"]
    assert saved_path.exists()


def test_upload_image_invalid_purpose(client, db_session):
    headers = _create_authenticated_headers(client, db_session, email="badpurpose@example.com")
    file_bytes = _build_png_bytes()

    resp = client.post(
        "/api/uploads",
        headers=headers,
        data={"purpose": "invalid"},
        files={"file": ("avatar.png", file_bytes, "image/png")},
    )

    assert resp.status_code == 400
    assert "unsupported purpose" in resp.json()["detail"].lower()


def test_upload_image_unsupported_mime(client, db_session):
    headers = _create_authenticated_headers(client, db_session, email="badmime@example.com")

    resp = client.post(
        "/api/uploads",
        headers=headers,
        data={"purpose": "avatar"},
        files={"file": ("malware.txt", BytesIO(b"plain text"), "text/plain")},
    )

    assert resp.status_code == 400
    assert "unsupported image type" in resp.json()["detail"].lower()


def test_upload_image_unauthorized(client):
    img_bytes = _build_png_bytes()
    resp = client.post(
        "/api/uploads",
        data={"purpose": "avatar"},
        files={"file": ("avatar.png", img_bytes, "image/png")},
    )
    assert resp.status_code == 401