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

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import hash_password
from app.database import engine
from app.log import setup_logging
from app.models import *  # noqa: F403 — ensure all models loaded for migrations
from app.models.user import User
from app.models.tenant import Tenant
from app.models.tenant_contact import TenantContact

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


async def _ensure_tables():
    async with engine.connect() as conn:
        tables = await conn.execute(
            text("SELECT table_name FROM information_schema.tables "
                 "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' "
                 "AND table_name != 'alembic_version'")
        )
        return [r[0] for r in tables]

def _run_migrations(force: bool = False):
    base_dir = os.path.dirname(os.path.dirname(__file__))
    if force:
        subprocess.run(
            [sys.executable, "-m", "alembic", "stamp", "base"],
            capture_output=True, cwd=base_dir,
        )
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        capture_output=True, text=True, cwd=base_dir,
    )
    if result.returncode != 0:
        logger.error("Migration failed:\n%s", result.stderr)
        result.check_returncode()
    for line in result.stdout.splitlines():
        if line.strip():
            logger.info("migration: %s", line)


async def seed():
    logger.info("Running migrations...")
    tables_exist = await _ensure_tables()
    _run_migrations(force=not tables_exist)
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

        # Seed sample tenants if none exist
        result = await session.execute(select(Tenant).limit(1))
        if not result.scalar_one_or_none():
            tenants_data = [
                {
                    "name": "Dynamo Coworking",
                    "unit": "4-A",
                    "floor": 4,
                    "primary_phone": "+526641234567",
                    "contacts": [
                        {"name": "Alejandra García", "phone": "+526641234567", "is_primary": True},
                        {"name": "Roberto Méndez", "phone": "+526647654321", "is_backup": True},
                    ],
                },
                {
                    "name": "Bajapack",
                    "unit": "2-B",
                    "floor": 2,
                    "primary_phone": "+526642345678",
                    "contacts": [
                        {"name": "Carlos Jiménez", "phone": "+526642345678", "is_primary": True},
                    ],
                },
                {
                    "name": "Torre Abogados",
                    "unit": "10-A",
                    "floor": 10,
                    "primary_phone": "+526643456789",
                    "contacts": [
                        {"name": "Lic. Fernanda Torres", "phone": "+526643456789", "is_primary": True},
                        {"name": "Daniela Ríos", "phone": "+526647654322", "is_backup": True},
                    ],
                },
                {
                    "name": "Cafetería El Ático",
                    "unit": "PB",
                    "floor": 0,
                    "primary_phone": "+526644567890",
                    "contacts": [
                        {"name": "Jorge Morales", "phone": "+526644567890", "is_primary": True},
                    ],
                },
                {
                    "name": "Innovación Tech",
                    "unit": "7-C",
                    "floor": 7,
                    "primary_phone": "+526645678901",
                    "contacts": [
                        {"name": "Mónica Herrera", "phone": "+526645678901", "is_primary": True},
                        {"name": "Luis Camacho", "phone": "+526647654323", "is_backup": True},
                    ],
                },
            ]
            for td in tenants_data:
                contacts = td.pop("contacts")
                tenant = Tenant(**td)
                session.add(tenant)
                await session.flush()
                for cd in contacts:
                    contact = TenantContact(tenant_id=tenant.id, **cd)
                    session.add(contact)
                logger.info("Created tenant: %s (%d contacts)", td["name"], len(contacts))
        else:
            logger.info("Tenants already exist, skipping seed")

        await session.commit()
        logger.info("Done. %d created, %d skipped.", created, skipped)

    await engine.dispose()


def main():
    asyncio.run(seed())


if __name__ == "__main__":
    main()
