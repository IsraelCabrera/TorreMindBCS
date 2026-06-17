"""Seed the database with default users and mock data for testing.

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
import uuid
import asyncio
import subprocess
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import engine
from app.log import setup_logging
from app.models import *  # noqa: F403 — ensure all models loaded for migrations
from app.models.user import User
from app.models.visitor import Visitor
from app.models.visit_record import VisitRecord
from app.models.tenant import Tenant
from app.models.tenant_contact import TenantContact
from app.models.delivery import DeliveryRecord
from app.models.blocklist import BlocklistEntry
from app.models.notification_log import NotificationLog
from app.models.metric_log import MetricLog
from app.seed_defaults import seed_default_users

logger = setup_logging(name="seed", log_file="seed.log", level=logging.INFO)


SAMPLE_VISITORS = [
    {"name": "Juan Pérez", "phone": "+526649876543", "company": "Acme Corp"},
    {"name": "María García", "phone": "+526641112233", "company": "Servicios DG"},
    {"name": "Carlos López", "phone": "+526644556677", "company": None},
    {"name": "Ana Martínez", "phone": "+526647788990", "company": "Tech Solutions"},
    {"name": "Roberto Sánchez", "phone": "+526643322111", "company": "Constructora MX"},
]

SAMPLE_DELIVERIES = [
    {"courier": "DHL", "recipient_name": "Alejandra García", "description": "Documentos legales", "guide_number": "DHL-9876543210"},
    {"courier": "FedEx", "recipient_name": "Carlos Jiménez", "description": "Paquete mediano", "guide_number": "FX-1234567890"},
    {"courier": "Estafeta", "recipient_name": "Lic. Fernanda Torres", "description": "Caja chica", "guide_number": "EST-555666777"},
]

SAMPLE_BLOCKLIST = [
    {"name": "Jorge Rentería", "reason": "Acceso no autorizado reiterado", "phone": "+526649999999"},
    {"name": "Lucía Fernández", "reason": "Reporte de conducta inapropiada", "phone": None},
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


async def _get_or_create_visitors(session: AsyncSession) -> list[Visitor]:
    existing = (await session.execute(select(Visitor))).scalars().all()
    if existing:
        logger.info("Visitors already exist, skipping")
        return list(existing)

    visitors = []
    for vd in SAMPLE_VISITORS:
        visitor = Visitor(**vd)
        session.add(visitor)
        visitors.append(visitor)
        logger.info("Created visitor: %s", vd["name"])
    await session.flush()
    return visitors


async def _get_or_create_visits(session: AsyncSession, visitors: list[Visitor],
                                 staff_user: User, tenants: list[Tenant]) -> None:
    existing = (await session.execute(select(VisitRecord).limit(1))).scalar_one_or_none()
    if existing:
        logger.info("Visits already exist, skipping")
        return

    now = datetime.now(timezone.utc)
    visit_data = [
        {"visitor": visitors[0], "tenant": tenants[0], "status": "approved",
         "check_in_at": now - timedelta(hours=1), "host_name": "Alejandra García",
         "visitor_type": "tenant_visitor", "acknowledged_at": now - timedelta(minutes=55)},
        {"visitor": visitors[1], "tenant": tenants[1], "status": "pending",
         "check_in_at": now - timedelta(minutes=30), "host_name": "Carlos Jiménez",
         "visitor_type": "vendor"},
        {"visitor": visitors[2], "tenant": None, "status": "checked_out",
         "check_in_at": now - timedelta(hours=3), "check_out_at": now - timedelta(hours=1),
         "visitor_type": "walk_in"},
        {"visitor": visitors[3], "tenant": tenants[4], "status": "staff_decision",
         "check_in_at": now - timedelta(minutes=45), "host_name": "Mónica Herrera",
         "visitor_type": "prospective_tenant", "escalation_state": "staff_decision_needed"},
    ]
    for vd in visit_data:
        visitor = vd.pop("visitor")
        tenant = vd.pop("tenant")
        visit = VisitRecord(
            visitor_id=visitor.id,
            tenant_id=tenant.id if tenant else None,
            created_by_user_id=staff_user.id,
            **vd,
        )
        session.add(visit)
        logger.info("Created visit: %s → %s (%s)", visitor.name,
                     tenant.name if tenant else "(sin tenant)", vd["status"])
    await session.flush()


async def _get_or_create_deliveries(session: AsyncSession, staff_user: User,
                                     tenants: list[Tenant]) -> None:
    existing = (await session.execute(select(DeliveryRecord).limit(1))).scalar_one_or_none()
    if existing:
        logger.info("Deliveries already exist, skipping")
        return

    now = datetime.now(timezone.utc)
    tenant_map = {
        "Alejandra García": tenants[0],
        "Carlos Jiménez": tenants[1],
        "Lic. Fernanda Torres": tenants[2],
    }
    for dd in SAMPLE_DELIVERIES:
        delivery = DeliveryRecord(
            courier=dd["courier"],
            recipient_name=dd["recipient_name"],
            description=dd["description"],
            guide_number=dd["guide_number"],
            tenant_id=tenant_map[dd["recipient_name"]].id,
            check_in_at=now - timedelta(hours=2),
        )
        session.add(delivery)
        logger.info("Created delivery: %s → %s", dd["courier"], dd["recipient_name"])
    await session.flush()


async def _get_or_create_blocklist(session: AsyncSession, admin_user: User) -> None:
    existing = (await session.execute(select(BlocklistEntry).limit(1))).scalar_one_or_none()
    if existing:
        logger.info("Blocklist entries already exist, skipping")
        return

    for be in SAMPLE_BLOCKLIST:
        entry = BlocklistEntry(
            name=be["name"],
            reason=be["reason"],
            phone=be.get("phone"),
            added_by_user_id=admin_user.id,
        )
        session.add(entry)
        logger.info("Created blocklist: %s", be["name"])
    await session.flush()


async def seed():
    logger.info("Running migrations...")
    tables_exist = await _ensure_tables()
    _run_migrations(force=not tables_exist)
    logger.info("Seeding database...")

    async with AsyncSession(engine) as session:
        await seed_default_users(session)
        # Re-query after seed_default_users commits
        staff_user = (await session.execute(
            select(User).where(User.role == "lobby_staff").limit(1)
        )).scalar_one_or_none()
        admin_user = (await session.execute(
            select(User).where(User.role == "admin").limit(1)
        )).scalar_one_or_none()

        # Delete and recreate tenants to guarantee idempotency
        # Order matters: child tables first (FK constraints)
        await session.execute(delete(VisitRecord))
        await session.execute(delete(DeliveryRecord))
        await session.execute(delete(BlocklistEntry))
        await session.execute(delete(NotificationLog))
        await session.execute(delete(MetricLog))
        await session.execute(delete(TenantContact))
        await session.execute(delete(Tenant))
        await session.execute(delete(Visitor))
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
            contacts_list = td.pop("contacts")
            tenant = Tenant(**td)
            session.add(tenant)
            await session.flush()
            for cd in contacts_list:
                contact = TenantContact(tenant_id=tenant.id, **cd)
                session.add(contact)
            logger.info("Created tenant: %s (%d contacts)", td["name"], len(contacts_list))

        await session.commit()

        await _get_or_create_visitors(session)
        await session.commit()

        # Re-query all entities fresh — commit expires session objects
        tenants = (await session.execute(select(Tenant))).scalars().all()
        visitors = (await session.execute(select(Visitor))).scalars().all()
        staff_user = (await session.execute(
            select(User).where(User.role == "lobby_staff").limit(1)
        )).scalar_one_or_none()
        admin_user = (await session.execute(
            select(User).where(User.role == "admin").limit(1)
        )).scalar_one_or_none()

        if staff_user:
            await _get_or_create_visits(session, visitors, staff_user, tenants)
            await _get_or_create_deliveries(session, staff_user, tenants)
            await session.commit()
        else:
            logger.warning("No staff user found — skipping visits and deliveries seed")

        if admin_user:
            # Re-query admin_user fresh — previous commit expired it
            admin_user = (await session.execute(
                select(User).where(User.role == "admin").limit(1)
            )).scalar_one_or_none()
            await _get_or_create_blocklist(session, admin_user)
            await session.commit()

        logger.info("Done.")

    await engine.dispose()


def main():
    asyncio.run(seed())


if __name__ == "__main__":
    main()
