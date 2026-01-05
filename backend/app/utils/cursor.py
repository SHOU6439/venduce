"""Cursor-based pagination utilities.

Provides encoding and decoding utilities for cursor-based pagination.
Cursors are Base64-encoded JSON strings containing timestamp and ID.
"""
from __future__ import annotations

import base64
import json
from datetime import datetime
from typing import Tuple

from fastapi import HTTPException, status


def encode_cursor(created_at: datetime, item_id: str) -> str:
    """Encode a cursor from timestamp and ID.

    Args:
        created_at: Timestamp of the item
        item_id: Unique identifier of the item

    Returns:
        Base64-encoded cursor string
    """
    data = {
        "created_at": created_at.isoformat(),
        "id": item_id
    }
    json_str = json.dumps(data)
    return base64.urlsafe_b64encode(json_str.encode()).decode()


def decode_cursor(cursor: str) -> Tuple[datetime, str]:
    """Decode a cursor to timestamp and ID.

    Args:
        cursor: Base64-encoded cursor string

    Returns:
        Tuple of (created_at, item_id)

    Raises:
        HTTPException: If cursor is invalid or malformed
    """
    try:
        json_str = base64.urlsafe_b64decode(cursor.encode()).decode()
        data = json.loads(json_str)
        created_at = datetime.fromisoformat(data["created_at"])
        item_id = data["id"]
        return created_at, item_id
    except (KeyError, ValueError, json.JSONDecodeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid cursor format: {str(e)}"
        )


__all__ = ["encode_cursor", "decode_cursor"]
