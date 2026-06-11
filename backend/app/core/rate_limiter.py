import time

from redis import asyncio as aioredis
from redis.exceptions import RedisError

from app.config import settings

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis | None:
    global _redis
    if _redis is None:
        try:
            _redis = await aioredis.from_url(settings.redis_url, socket_connect_timeout=1)
        except RedisError:
            return None
    return _redis


async def check_rate_limit(ip: str, action: str, max_requests: int, window_seconds: int) -> bool:
    r = await get_redis()
    if r is None:
        return True
    key = f"rl:{ip}:{action}"
    now = int(time.time())
    try:
        pipe = r.pipeline()
        pipe.zremrangebyscore(key, 0, now - window_seconds)
        pipe.zcard(key)
        pipe.zadd(key, {f"{now}:{id(ip)}": now})
        pipe.expire(key, window_seconds)
        _, count, _, _ = await pipe.execute()
        return count < max_requests
    except RedisError:
        return True
