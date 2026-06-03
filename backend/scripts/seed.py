"""Seed the database with default users.

Usage:
    uv run python -m scripts.seed

Optional env vars (or uses defaults):
    SEED_ADMIN_EMAIL=admin@torremind.com
    SEED_ADMIN_PASSWORD=admin123
    SEED_STAFF_EMAIL=staff@torremind.com
    SEED_STAFF_PASSWORD=staff123
    SEED_SECURITY_EMAIL=security@torremind.com
    SEED_SECURITY_PASSWORD=security123

Idempotent: safe to run multiple times.
"""

import logging
import os
import asyncio
import subprocess
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import hash_password
from app.database import engine
from app.log import setup_logging
from app.models import *  # noqa: F403 — ensure all models loaded for migrations
from app.models.user import User

logger = setup_logging(name="seed", log_file="seed.log", level=logging.INFO)


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


def _run_migrations():
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        capture_output=True, text=True, cwd=os.path.dirname(os.path.dirname(__file__)),
    )
    if result.returncode != 0:
        logger.error("Migration failed:\n%s", result.stderr)
        result.check_returncode()
    for line in result.stdout.splitlines():
        if line.strip():
            logger.info("migration: %s", line)


async def seed():
    logger.info("Running migrations...")
    _run_migrations()
    logger.info("Seeding database...")
    async with AsyncSession(engine) as session:
        created = 0
        skipped = 0

        for u in DEFAULT_USERS:
            result = await session.execute(select(User).where(User.email == u["email"]))
            if result.scalar_one_or_none():
                logger.info("⏭ %s — already exists, skipping", u["email"])
                skipped += 1
                continue

            user = User(
                email=u["email"],
                password_hash=hash_password(u["password"]),
                name=u["name"],
                role=u["role"],
            )
            session.add(user)
            created += 1
            logger.info("Created %s (%s)", u["email"], u["role"])

        await session.commit()
        logger.info("Done. %d created, %d skipped.", created, skipped)

    await engine.dispose()


def main():
    asyncio.run(seed())


if __name__ == "__main__":
    main()
