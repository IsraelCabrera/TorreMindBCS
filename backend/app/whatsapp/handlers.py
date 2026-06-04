import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.visit_record import VisitRecord
from app.models.tenant_contact import TenantContact
from app.models.notification_log import NotificationLog
from app.whatsapp.client import send_template_message
from app.whatsapp.messages import build_host_acknowledgment, build_package_notification, build_package_collected
from app.websocket.manager import emit_visit_update
from app.config import settings


async def notify_host(
    db: AsyncSession,
    visit: VisitRecord,
):
    if not visit.tenant_id:
        return

    result = await db.execute(
        select(TenantContact)
        .where(TenantContact.tenant_id == visit.tenant_id, TenantContact.is_primary == True)
        .limit(1)
    )
    contact = result.scalar_one_or_none()
    if not contact or not contact.phone:
        return

    visitor_name = visit.visitor.name if visit.visitor else "Un visitante"
    visitor_company = visit.visitor.company if visit.visitor else None

    payload = build_host_acknowledgment(str(visit.id), visitor_name, visitor_company)
    try:
        resp = await send_template_message(contact.phone, "host_acknowledgment", components=payload["template"]["components"])
        log = NotificationLog(
            visit_id=visit.id,
            channel="whatsapp",
            template_name="host_acknowledgment",
            recipient=contact.phone,
            status="sent",
            meta_message_id=resp.get("messages", [{}])[0].get("id"),
            sent_at=datetime.now(timezone.utc),
        )
        db.add(log)
        visit.notification_sent_at = datetime.now(timezone.utc)
        await db.commit()
    except Exception as e:
        log = NotificationLog(
            visit_id=visit.id,
            channel="whatsapp",
            template_name="host_acknowledgment",
            recipient=contact.phone,
            status="failed",
            sent_at=datetime.now(timezone.utc),
        )
        db.add(log)
        await db.commit()


async def notify_delivery_collected(
    db: AsyncSession,
    courier: str,
    recipient_name: str,
    guide_number: str | None,
    recipient_phone: str,
    delivery_id: uuid.UUID,
):
    try:
        payload = build_package_collected(courier, recipient_name, guide_number)
        resp = await send_template_message(
            recipient_phone, "package_collected",
            components=payload["template"]["components"],
        )
        log = NotificationLog(
            delivery_id=delivery_id,
            channel="whatsapp",
            template_name="package_collected",
            recipient=recipient_phone,
            status="sent",
            meta_message_id=resp.get("messages", [{}])[0].get("id"),
            sent_at=datetime.now(timezone.utc),
        )
        db.add(log)
        await db.commit()
    except Exception:
        pass


async def notify_delivery_recipient(
    db: AsyncSession,
    courier: str,
    recipient_name: str,
    guide_number: str | None,
    recipient_phone: str,
    delivery_id: uuid.UUID,
):
    try:
        payload = build_package_notification(courier, recipient_name, guide_number)
        resp = await send_template_message(
            recipient_phone, "package_arrival",
            components=payload["template"]["components"],
        )
        log = NotificationLog(
            delivery_id=delivery_id,
            channel="whatsapp",
            template_name="package_arrival",
            recipient=recipient_phone,
            status="sent",
            meta_message_id=resp.get("messages", [{}])[0].get("id"),
            sent_at=datetime.now(timezone.utc),
        )
        db.add(log)
        await db.commit()
    except Exception:
        pass
