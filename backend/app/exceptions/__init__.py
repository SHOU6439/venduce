"""Shared domain exceptions for the venduce backend."""

from __future__ import annotations


class VenduceError(Exception):
    """Base class for domain-specific exceptions."""


class UserAlreadyExists(VenduceError):
    """Raised when a user registers with an email/username that already exists."""


class ConfirmationError(VenduceError):
    """Raised when account confirmation fails."""


class RefreshTokenError(VenduceError):
    """Raised when refresh token handling encounters an invalid or revoked token."""


class AuthenticationError(VenduceError):
    """Authentication/authorization failure that carries HTTP-friendly metadata."""

    def __init__(self, code: str, message: str, status_code: int = 401):
        self.code = code
        self.message = message
        self.status_code = status_code

    @property
    def detail(self) -> dict[str, str]:
        return {"code": self.code, "message": self.message}


__all__ = [
    "AuthenticationError",
    "ConfirmationError",
    "VenduceError",
    "RefreshTokenError",
    "UserAlreadyExists",
]
