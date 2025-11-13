from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_serializer

from app.utils.timezone import to_jst


class AppModel(BaseModel):
    """Base Pydantic model for the application.

    - Automatically serializes all datetime fields to JST ISO8601 strings.
    """

    model_config = ConfigDict()

    @field_serializer("*", mode="wrap")
    def serialize_datetimes(self, value, handler):
        """Serialize all datetime fields to JST ISO8601 strings."""
        serialized = handler(value)
        
        if isinstance(value, datetime):
            return to_jst(value).isoformat()
        
        return serialized


__all__ = ["AppModel"]
