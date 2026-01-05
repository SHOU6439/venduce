"""Pagination schemas for API responses.

Provides generic pagination response schemas for cursor-based pagination.
"""
from __future__ import annotations

from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar('T')


class CursorMeta(BaseModel):
    """Metadata for cursor-based pagination.

    Attributes:
        next_cursor: Cursor for the next page (None if no more pages)
        has_more: Whether there are more items available
        returned: Number of items returned in this response
    """
    next_cursor: Optional[str] = Field(default=None, description="Cursor for next page")
    has_more: bool = Field(description="Whether more items are available")
    returned: int = Field(description="Number of items in this response")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper.

    Can be used with any item type, e.g., PaginatedResponse[PostRead].

    Attributes:
        items: List of items in this page
        meta: Pagination metadata
    """
    items: List[T] = Field(description="Items in this page")
    meta: CursorMeta = Field(description="Pagination metadata")


__all__ = ["CursorMeta", "PaginatedResponse"]
