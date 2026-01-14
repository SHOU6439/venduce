from datetime import datetime
from typing import Optional
from pydantic import EmailStr, Field, ConfigDict
from app.schemas.base import AppModel


class UserCreate(AppModel):
    email: EmailStr
    username: str = Field(..., min_length=6, max_length=32)
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)


class UserUpdate(AppModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    display_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=1000)
    avatar_url: Optional[str] = Field(None, max_length=1024)


class UserRead(AppModel):
    """Public user profile information returned to the client."""
    id: str
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    created_at: datetime
    is_confirmed: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class RegistrationResponse(AppModel):
    """Response for user registration endpoint."""
    message: str
    confirmation_token: Optional[str] = None

    model_config = ConfigDict()
