import uuid
from datetime import datetime, timezone

from arq import create_pool
from arq.connections import RedisSettings
from sqlalchemy import select

from app.database import async_session
from app.models.visit_record import VisitRecord
from app.models.tenant_contact import TenantContact
from app.whatsapp.handlers import notify_host
from app.websocket.manager import emit_visit_update
from app.config import settings


async def schedule_escalation(visit_id: str, delay_seconds: int) -> None:
    pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    try:
        await pool.enqueue_job("escalate_visit", visit_id, _defer_seconds=delay_seconds)
    finally:
        await pool.aclose()


async def escalate_visit(ctx: dict, visit_id: str) -> None:
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
