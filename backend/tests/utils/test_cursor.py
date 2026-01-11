"""Tests for cursor utility functions."""
from datetime import datetime, timezone
import pytest
from fastapi import HTTPException

from app.utils.cursor import encode_cursor, decode_cursor


def test_encode_cursor():
    """Test cursor encoding produces valid Base64 string."""
    created_at = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    item_id = "test-id-123"

    cursor = encode_cursor(created_at, item_id)

    assert isinstance(cursor, str)
    assert len(cursor) > 0


def test_decode_cursor_valid():
    """Test cursor decoding returns correct values."""
    created_at = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    item_id = "test-id-123"

    cursor = encode_cursor(created_at, item_id)
    decoded_created_at, decoded_id = decode_cursor(cursor)

    assert decoded_created_at == created_at
    assert decoded_id == item_id


def test_decode_cursor_invalid():
    """Test cursor decoding fails gracefully on invalid input."""
    invalid_cursor = "invalid-cursor"

    with pytest.raises(HTTPException) as exc_info:
        decode_cursor(invalid_cursor)

    assert exc_info.value.status_code == 400
    assert "Invalid cursor format" in exc_info.value.detail


def test_cursor_roundtrip():
    """Test encode -> decode roundtrip preserves data."""
    test_cases = [
        (datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc), "post-1"),
        (datetime(2024, 12, 31, 23, 59, 59, tzinfo=timezone.utc), "post-999"),
        (datetime.now(timezone.utc), "very-long-id-string-12345"),
    ]

    for original_time, original_id in test_cases:
        cursor = encode_cursor(original_time, original_id)
        decoded_time, decoded_id = decode_cursor(cursor)

        assert decoded_time == original_time
        assert decoded_id == original_id
