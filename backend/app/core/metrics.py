import time
from datetime import datetime, timezone
from functools import wraps

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.metric_log import MetricLog


def track_metric(action: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start = time.monotonic()
            result = await func(*args, **kwargs)
            duration_ms = int((time.monotonic() - start) * 1000)
            return result
        return wrapper
    return decorator


async def log_metric(
    db: AsyncSession,
    user_id: str | None,
    action: str,
    target_type: str | None,
    target_id: str | None,
    duration_ms: int,
    metadata: dict | None = None,
):
    now = datetime.now(timezone.utc)
    log = MetricLog(
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        started_at=now,
        completed_at=now,
        duration_ms=duration_ms,
        metadata=metadata,
    )
    db.add(log)
