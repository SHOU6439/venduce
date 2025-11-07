"""Fake/test-support utilities for backend tests.

Place lightweight in-memory fakes here that mimic service APIs used by FastAPI
routes so tests can swap dependencies via `app.dependency_overrides`.
"""

from .services.fake_user_service import FakeUserService
from .services.fake_user import FakeUser

__all__ = ["FakeUserService", "FakeUser"]
