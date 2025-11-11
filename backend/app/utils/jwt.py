from datetime import datetime, timedelta
import uuid
import jwt

from app.core.config import settings
from app.utils.timezone import now_utc


def _signing_key_and_alg() -> tuple[str, str]:
    """Return (key, alg) for signing tokens.

    For RS* algorithms this returns the private key; for HS* it returns the shared secret.
    Raises RuntimeError when the required key is not configured.
    """
    alg = settings.JWT_ALGORITHM or "RS256"
    if alg.upper().startswith("RS"):
        key = settings.JWT_PRIVATE_KEY
        if not key:
            raise RuntimeError("JWT_PRIVATE_KEY is not configured for RS* algorithm")
    else:
        key = settings.JWT_SECRET_KEY
        if not key:
            raise RuntimeError("JWT_SECRET_KEY is not configured for HS* algorithm")
    return key, alg


def _verification_key_and_alg() -> tuple[str, str]:
    """Return (key, alg) for verifying tokens.

    For RS* algorithms this returns the public key; for HS* it returns the shared secret.
    Raises RuntimeError when the required key is not configured.
    """
    alg = settings.JWT_ALGORITHM or "RS256"
    if alg.upper().startswith("RS"):
        key = settings.JWT_PUBLIC_KEY
        if not key:
            raise RuntimeError("JWT_PUBLIC_KEY is not configured for RS* algorithm")
    else:
        key = settings.JWT_SECRET_KEY
        if not key:
            raise RuntimeError("JWT_SECRET_KEY is not configured for HS* algorithm")
    return key, alg


def create_access_token(subject: str, roles: list[str] | None = None) -> tuple[str, int]:
    """Create a JWT access token. Returns (token, expires_in_seconds)."""
    now = now_utc()
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expires_at = now + expires_delta
    payload = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "typ": "access",
    }
    if roles:
        payload["roles"] = roles

    key, alg = _signing_key_and_alg()
    token = jwt.encode(payload, key, algorithm=alg)
    return token, int(expires_delta.total_seconds())


def create_refresh_token(subject: str, days: int | None = None) -> tuple[str, str, datetime]:
    """Create a refresh token. Returns (token, jwt_id, expires_at_datetime).

    `days` can override the default TTL (used for "remember me").
    """
    now = now_utc()
    ttl_days = days if days is not None else settings.REFRESH_TOKEN_EXPIRE_DAYS
    expires_delta = timedelta(days=ttl_days)
    expires_at = now + expires_delta
    jwt_id = str(uuid.uuid4())
    payload = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": jwt_id,
        "typ": "refresh",
    }
    key, alg = _signing_key_and_alg()
    token = jwt.encode(payload, key, algorithm=alg)
    return token, jwt_id, expires_at


def decode_token(token: str) -> dict:
    key, alg = _verification_key_and_alg()
    return jwt.decode(token, key, algorithms=[alg])
