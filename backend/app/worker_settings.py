from arq.connections import RedisSettings

from app.config import settings
from app.worker import escalate_visit


class WorkerSettings:
    functions = [escalate_visit]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    poll_delay = 1.0
