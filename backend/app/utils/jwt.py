from datetime import datetime, timedelta
import uuid
import jwt

from app.core.config import settings
from pathlib import Path

from app.utils.timezone import now_utc

def _load_key(possible_value: str | None, possible_path: str | None) -> str | None:
    """Return key contents.

    Priority:
    1. If possible_path is set, read file and return contents.
    2. If possible_value is set and contains escaped newlines ("\\n"), unescape and return.
    3. If possible_value is set, return as-is.
    4. Otherwise return None.
    """
    if possible_path:
        try:
            return Path(possible_path).read_text(encoding="utf-8")
        except Exception as e:
            raise RuntimeError(f"Failed to read key from path '{possible_path}': {e}") from e
    if possible_value:
        if "\\n" in possible_value:
            return possible_value.replace("\\n", "\n")
        return possible_value
    return None

def _signing_key_and_alg() -> tuple[str, str]:
    """Return (key, alg) for signing tokens.

    For RS* algorithms this returns the private key; for HS* it returns the shared secret.
    Raises RuntimeError when the required key is not configured.
    """
    alg = settings.JWT_ALGORITHM or "RS256"
    if alg.upper().startswith("RS"):
        key = _load_key(settings.JWT_PRIVATE_KEY, settings.JWT_PRIVATE_KEY_PATH)
        if not key:
            raise RuntimeError("JWT_PRIVATE_KEY (or JWT_PRIVATE_KEY_PATH) is not configured for RS* algorithm")
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
        key = _load_key(settings.JWT_PUBLIC_KEY, settings.JWT_PUBLIC_KEY_PATH)
        if not key:
            raise RuntimeError("JWT_PUBLIC_KEY (or JWT_PUBLIC_KEY_PATH) is not configured for RS* algorithm")
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


def create_refresh_token(subject: str, ttl_days: int | None = None) -> tuple[str, datetime]:
    """Create a refresh token. Returns (token, expires_at_datetime).

    `ttl_days` can override the default TTL (used for "remember me").
    """
    now = now_utc()
    ttl_days = ttl_days if ttl_days is not None else settings.REFRESH_TOKEN_EXPIRE_DAYS
    expires_delta = timedelta(days=ttl_days)
    expires_at = now + expires_delta
    
    payload = {
        "sub": str(subject),
        "jti": str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "typ": "refresh",
    }
    key, alg = _signing_key_and_alg()
    token = jwt.encode(payload, key, algorithm=alg)
    
    return token, expires_at


def decode_token(token: str) -> dict:
    key, alg = _verification_key_and_alg()
    return jwt.decode(token, key, algorithms=[alg])


def create_password_reset_token(subject: str) -> tuple[str, int]:
    """Create a JWT for password reset. Returns (token, expires_in_seconds)."""
    now = now_utc()
    expires_delta = timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
    expires_at = now + expires_delta
    payload = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "typ": "password_reset",
    }
    key, alg = _signing_key_and_alg()
    token = jwt.encode(payload, key, algorithm=alg)
    return token, int(expires_delta.total_seconds())
