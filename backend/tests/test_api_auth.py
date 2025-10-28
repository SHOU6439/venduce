
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.main import app

# Create a single in-memory SQLite engine/session for all test requests so
# that state (created users) is shared across multiple TestClient requests.
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_register_api_success():
    payload = {
        "email": "apiuser@example.com",
        "username": "apiuser",
        "password": "strongpassword",
        "first_name": "Api",
        "last_name": "User",
    }
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == payload["email"]
    assert data["username"] == payload["username"]


def test_register_api_conflict():
    payload = {
        "email": "conflict@example.com",
        "username": "conflict",
        "password": "strongpassword",
        "first_name": "Con",
        "last_name": "Flict",
    }
    r1 = client.post("/api/auth/register", json=payload)
    assert r1.status_code == 201
    r2 = client.post("/api/auth/register", json=payload)
    assert r2.status_code == 409
