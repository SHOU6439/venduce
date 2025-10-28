from datetime import datetime
from zoneinfo import ZoneInfo

JST = ZoneInfo("Asia/Tokyo")


def to_jst(dt: datetime) -> datetime:
    """Convert an aware UTC datetime to JST timezone.

    If dt is naive, it's assumed to be UTC.
    """
    if dt.tzinfo is None:
        # assume UTC
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(JST)
