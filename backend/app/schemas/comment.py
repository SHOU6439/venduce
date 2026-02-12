from __future__ import annotations

from typing import Optional, List
from datetime import datetime
from pydantic import ConfigDict, Field

from app.schemas.base import AppModel
from app.schemas.user import UserRead


class CommentBase(AppModel):
    content: str = Field(..., min_length=1, max_length=1000, description="Comment content")


class CommentCreate(CommentBase):
    parent_comment_id: Optional[str] = Field(None, description="Parent comment ID for replies")


class CommentUpdate(CommentBase):
    pass


class CommentResponse(CommentBase):
    id: str
    post_id: str
    user_id: str
    parent_comment_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool
    
    user: Optional[UserRead] = None
    replies: List["CommentResponse"] = Field(default=[], validation_alias="active_replies")

    model_config = ConfigDict(from_attributes=True)

CommentResponse.model_rebuild()
