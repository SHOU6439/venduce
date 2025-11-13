from pydantic import EmailStr
from app.schemas.base import AppModel
from typing import Optional


class LoginRequest(AppModel):
    email: EmailStr
    password: str
    remember: bool = False


class TokenPair(AppModel):
    access_token: str
    refresh_token: str
    expires_in: int


class RefreshRequest(AppModel):
    refresh_token: str


__all__ = ["LoginRequest", "TokenPair", "RefreshRequest"]
