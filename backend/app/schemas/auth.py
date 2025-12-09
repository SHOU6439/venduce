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
    token_type: str = "bearer"


class RefreshRequest(AppModel):
    refresh_token: str


class ResendRequest(AppModel):
    email: EmailStr


__all__ = ["LoginRequest", "TokenPair", "RefreshRequest", "ResendRequest"]
