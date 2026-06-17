"""Create default users on server startup.

Runs automatically during the lifespan startup and is safe to run
multiple times (checks for existing users before creating).
"""

import logging
import os

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import hash_password
from app.models.user import User

logger = logging.getLogger("vlms")

DEFAULT_USERS = [
    {
        "email": os.getenv("SEED_ADMIN_EMAIL", "admin@torremind.com"),
        "password": os.getenv("SEED_ADMIN_PASSWORD", "Admin123!"),
        "name": "Admin",
        "role": "admin",
    },
    {
        "email": os.getenv("SEED_STAFF_EMAIL", "staff@torremind.com"),
        "password": os.getenv("SEED_STAFF_PASSWORD", "Staff123!"),
        "name": "Staff",
        "role": "lobby_staff",
    },
    {
        "email": os.getenv("SEED_SECURITY_EMAIL", "security@torremind.com"),
        "password": os.getenv("SEED_SECURITY_PASSWORD", "Security123!"),
        "name": "Security",
        "role": "security",
    },
]


async def seed_default_users(db: AsyncSession) -> None:
    for u in DEFAULT_USERS:
        result = await db.execute(select(User).where(User.email == u["email"]))
        existing = result.scalar_one_or_none()
        if existing:
            logger.debug("Default user %s already exists, skipping", u["email"])
            continue

        user = User(
            email=u["email"],
            password_hash=hash_password(u["password"]),
            name=u["name"],
            role=u["role"],
        )
        db.add(user)
        logger.info("Created default user: %s (%s)", u["email"], u["role"])

    await db.commit()
