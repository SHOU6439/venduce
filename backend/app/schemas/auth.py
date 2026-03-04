from pydantic import EmailStr
from app.schemas.base import AppModel
from typing import Optional
from app.schemas.user import UserRead


class LoginRequest(AppModel):
    email: EmailStr
    password: str
    remember: bool = False


class TokenPair(AppModel):
    access_token: str
    refresh_token: str
    expires_in: int
    refresh_expires_in: int
    token_type: str = "bearer"
    user: Optional["UserRead"] = None


class RefreshRequest(AppModel):
    refresh_token: str


class ResendRequest(AppModel):
    email: EmailStr


class ForgotPasswordRequest(AppModel):
    email: EmailStr


class ResetPasswordRequest(AppModel):
    token: str
    new_password: str


__all__ = [
    "LoginRequest",
    "TokenPair",
    "RefreshRequest",
    "ResendRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
]
