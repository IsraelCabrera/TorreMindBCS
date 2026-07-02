import uuid
from datetime import datetime, timezone, date, time
from zoneinfo import ZoneInfo

from arq import create_pool
from arq.connections import RedisSettings
from arq.cron import cron
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.database import async_session
from app.models.visit_record import VisitRecord
from app.models.delivery import DeliveryRecord
from app.models.tenant_contact import TenantContact
from app.whatsapp.handlers import notify_host
from app.websocket.manager import emit_visit_update
from app.core.audit import log_audit
from app.config import settings


async def schedule_escalation(visit_id: str, delay_seconds: int) -> None:
    pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    try:
        await pool.enqueue_job("escalate_visit", visit_id, _defer_seconds=delay_seconds)
    finally:
        await pool.aclose()


async def escalate_visit(ctx: dict, visit_id: str, _defer_seconds: int = 0) -> None:
    try:
        visit_uuid = uuid.UUID(visit_id)
    except ValueError:
        return
    async with async_session() as db:
        result = await db.execute(select(VisitRecord).where(VisitRecord.id == visit_uuid))
        visit = result.scalar_one_or_none()
        if not visit or visit.status != "pending":
            return

        contacts_result = await db.execute(
            select(TenantContact)
            .where(TenantContact.tenant_id == visit.tenant_id)
            .order_by(TenantContact.escalation_order)
        )
        contacts = contacts_result.scalars().all()

        visit.escalated_at = datetime.now(timezone.utc)

        if len(contacts) > 1:
            contact = contacts[1]
            visit.escalation_state = "escalated_to_secondary"
            visit.status = "escalated"
            visitor_name = visit.visitor.name if visit.visitor else "Un visitante"
            from app.whatsapp.messages import build_escalation_message
            from app.whatsapp.client import send_template_message

            try:
                payload = build_escalation_message(visitor_name)
                await send_template_message(
                    contact.phone, "host_escalated",
                    components=payload["template"]["components"],
                )
            except Exception:
                pass
        else:
            visit.escalation_state = "staff_decision_needed"
            visit.status = "staff_decision"

        await db.commit()
        await emit_visit_update("visit:updated", {
            "id": str(visit.id),
            "status": visit.status,
            "escalation_state": visit.escalation_state,
        })


async def eod_auto_checkout_and_report(ctx: dict) -> None:
    """
    End-of-day job: runs at configured time (default 23:59 America/Tijuana).
    - Auto-checks out all visits from today that haven't checked out
    - Emits Socket.IO events for real-time dashboard updates
    - Logs audit entries
    - Optionally sends WhatsApp notifications to hosts
    """
    tz = ZoneInfo(settings.eod_timezone)
    now = datetime.now(tz)
    eod_timestamp = datetime.combine(now.date(), time(settings.eod_checkout_hour, settings.eod_checkout_minute), tzinfo=tz)
    
    async with async_session() as db:
        # Find all visits from today that haven't checked out
        today = now.date()
        stmt = select(VisitRecord).where(
            and_(
                func.date(VisitRecord.check_in_at) == today,
                VisitRecord.check_out_at.is_(None),
            )
        ).options(selectinload(VisitRecord.visitor))
        result = await db.execute(stmt)
        visits = result.scalars().all()

        auto_checked_out = []
        for visit in visits:
            visit.status = "checked_out"
            visit.check_out_at = eod_timestamp
            visit.escalation_state = "auto_eod"
            
            # Log audit
            await log_audit(db, None, "auto_checkout", "visit", str(visit.id),
                            details={"visitor_name": visit.visitor.name if visit.visitor else "Unknown",
                                     "auto_eod": True, "eod_timestamp": eod_timestamp.isoformat()})
            
            auto_checked_out.append(visit)
            
            # Emit Socket.IO event for real-time dashboard
            await emit_visit_update("visit:updated", {
                "id": str(visit.id),
                "status": "checked_out",
                "check_out_at": eod_timestamp.isoformat(),
                "escalation_state": "auto_eod",
            })

            # Optionally notify host via WhatsApp (reuse host_acknowledgment template)
            if settings.whatsapp_auto_eod_notify and visit.tenant_contact_id:
                try:
                    visitor_name = visit.visitor.name if visit.visitor else "Un visitante"
                    await notify_host(db, visit)
                except Exception:
                    pass

        await db.commit()

        # Compute delivery stats for the day
        delivery_stmt = select(DeliveryRecord).where(func.date(DeliveryRecord.check_in_at) == today)
        delivery_result = await db.execute(delivery_stmt)
        deliveries = delivery_result.scalars().all()
        
        deliveries_received = len(deliveries)
        deliveries_pending = len([d for d in deliveries if d.status == "pending"])
        deliveries_collected = len([d for d in deliveries if d.status == "collected"])

        # Report summary (logged for monitoring)
        report = {
            "date": today.isoformat(),
            "eod_timestamp": eod_timestamp.isoformat(),
            "total_visits_today": len(visits),
            "auto_checked_out": len(auto_checked_out),
            "manual_checkouts": len([v for v in visits if v.status == "checked_out" and v.escalation_state != "auto_eod"]),
            "still_inside": len([v for v in visits if v.check_out_at is None]),
            "deliveries_received": deliveries_received,
            "deliveries_pending": deliveries_pending,
            "deliveries_collected": deliveries_collected,
            "auto_checkout_details": [
                {
                    "visit_id": str(v.id),
                    "visitor_name": v.visitor.name if v.visitor else "Unknown",
                    "check_in_at": v.check_in_at.isoformat(),
                    "auto_checkout_at": eod_timestamp.isoformat(),
                    "host_name": v.host_name,
                }
                for v in auto_checked_out
            ],
            "pending_deliveries": [
                {
                    "delivery_id": str(d.id),
                    "courier": d.courier,
                    "recipient_name": d.recipient_name,
                    "check_in_at": d.check_in_at.isoformat(),
                }
                for d in deliveries if d.status == "pending"
            ],
        }
        
        # Log the report (in production, could send to monitoring system)
        from app.core.metrics import log_metric
        await log_metric(db, None, "eod_report", "system", None, 0, {"report": report})


# ARQ Worker Settings
class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    functions = [escalate_visit, eod_auto_checkout_and_report]
    cron_jobs = [
        cron(eod_auto_checkout_and_report, hour=settings.eod_checkout_hour, minute=settings.eod_checkout_minute),
    ]