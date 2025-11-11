from datetime import datetime, timezone
from zoneinfo import ZoneInfo

JST = ZoneInfo("Asia/Tokyo")


def now_utc() -> datetime:
    """Return current UTC time as an aware datetime.

    Use this function across the project for a single place to mock/override in tests.
    """
    return datetime.now(timezone.utc)


def to_jst(dt: datetime) -> datetime:
    """Convert an aware UTC datetime to JST timezone.

    If dt is naive, it's assumed to be UTC.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(JST)
