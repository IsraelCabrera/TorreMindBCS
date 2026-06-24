import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, model_validator
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session, staff_or_admin
from app.core.audit import log_audit
from app.models.delivery import DeliveryRecord
from app.models.tenant import Tenant
from app.models.tenant_contact import TenantContact
from app.whatsapp.handlers import notify_delivery_recipient, notify_delivery_collected

router = APIRouter()


class DeliveryCreate(BaseModel):
    courier: str
    guide_number: str | None = None
    recipient_name: str
    recipient_phone: str | None = None
    tenant_id: str | None = None
    description: str | None = None


class CollectRequest(BaseModel):
    collected_by: Literal["owner", "other"]
    collected_by_name: str | None = None

    @model_validator(mode="after")
    def validate_name_when_other(self) -> "CollectRequest":
        if self.collected_by == "other" and (not self.collected_by_name or not self.collected_by_name.strip()):
            raise ValueError("Name is required when collected by 'other'")
        if self.collected_by_name:
            self.collected_by_name = self.collected_by_name.strip()
        return self


class DeliveryResponse(BaseModel):
    id: str
    courier: str
    guide_number: str | None
    recipient_name: str
    recipient_phone: str | None
    description: str | None
    status: str
    check_in_at: str
    collected_at: str | None
    collected_by: str | None
    collected_by_name: str | None
    notification_sent: bool


@router.get("")
async def list_deliveries(
    status: Literal["pending", "collected", "all"] = Query("pending"),
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    query = select(DeliveryRecord).order_by(desc(DeliveryRecord.check_in_at))
    if status == "pending":
        query = query.where(DeliveryRecord.status == "pending")
    elif status == "collected":
        query = query.where(DeliveryRecord.status == "collected")
    result = await db.execute(query)
    deliveries = result.scalars().all()
    return [
        DeliveryResponse(
            id=str(d.id), courier=d.courier, guide_number=d.guide_number,
            recipient_name=d.recipient_name,
            recipient_phone=d.recipient_phone, description=d.description,
            status=d.status, check_in_at=d.check_in_at.isoformat(),
            collected_at=d.collected_at.isoformat() if d.collected_at else None,
            collected_by=d.collected_by,
            collected_by_name=d.collected_by_name,
            notification_sent=d.notification_sent,
        )
        for d in deliveries
    ]


@router.post("")
async def create_delivery(
    body: DeliveryCreate,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    delivery = DeliveryRecord(
        courier=body.courier, guide_number=body.guide_number,
        recipient_name=body.recipient_name,
        recipient_phone=body.recipient_phone, description=body.description,
        check_in_at=datetime.now(timezone.utc), status="pending",
    )
    if body.tenant_id:
        delivery.tenant_id = uuid.UUID(body.tenant_id)
    db.add(delivery)
    await db.flush()
    await log_audit(db, user["id"], "create", "delivery", str(delivery.id),
                    details={"courier": body.courier, "recipient_name": body.recipient_name})
    await db.commit()
    await db.refresh(delivery)
    return DeliveryResponse(
        id=str(delivery.id), courier=delivery.courier, guide_number=delivery.guide_number,
        recipient_name=delivery.recipient_name,
        recipient_phone=delivery.recipient_phone,
        description=delivery.description, status=delivery.status,
        check_in_at=delivery.check_in_at.isoformat(),
        collected_at=None, collected_by=None, collected_by_name=None,
        notification_sent=delivery.notification_sent,
    )


@router.post("/{delivery_id}/notify")
async def notify_delivery(
    delivery_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    result = await db.execute(select(DeliveryRecord).where(DeliveryRecord.id == delivery_id))
    delivery = result.scalar_one_or_none()
    if not delivery:
        raise HTTPException(status_code=404)

    phone = delivery.recipient_phone
    if not phone:
        contact_result = await db.execute(
            select(TenantContact).where(TenantContact.name == delivery.recipient_name,
                                         TenantContact.phone.isnot(None)).limit(1)
        )
        contact = contact_result.scalar_one_or_none()
        if contact and contact.phone:
            phone = contact.phone
            delivery.recipient_phone = phone

    if not phone:
        raise HTTPException(status_code=400, detail="Recipient has no phone number")

    await notify_delivery_recipient(db, delivery.courier, delivery.recipient_name, delivery.guide_number, phone, delivery.id)
    delivery.notification_sent = True
    await log_audit(db, user["id"], "notify", "delivery", str(delivery_id),
                    details={"phone": phone, "recipient_name": delivery.recipient_name})
    await db.commit()
    return {"status": "notification_sent"}


@router.post("/{delivery_id}/collect")
async def mark_collected(
    delivery_id: uuid.UUID,
    body: CollectRequest,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    result = await db.execute(select(DeliveryRecord).where(DeliveryRecord.id == delivery_id))
    delivery = result.scalar_one_or_none()
    if not delivery:
        raise HTTPException(status_code=404)
    delivery.status = "collected"
    delivery.collected_at = datetime.now(timezone.utc)
    delivery.collected_by = body.collected_by
    delivery.collected_by_name = body.collected_by_name

    phone = delivery.recipient_phone
    if not phone:
        contact_result = await db.execute(
            select(TenantContact).where(TenantContact.name == delivery.recipient_name,
                                         TenantContact.phone.isnot(None)).limit(1)
        )
        contact = contact_result.scalar_one_or_none()
        if contact and contact.phone:
            phone = contact.phone
    if phone:
        await notify_delivery_collected(db, delivery.courier, delivery.recipient_name,
                                         delivery.guide_number, phone, delivery.id)

    await log_audit(db, user["id"], "collect", "delivery", str(delivery_id),
                    details={"recipient_name": delivery.recipient_name,
                             "collected_by": body.collected_by,
                             "collected_by_name": body.collected_by_name})
    await db.commit()
    return {"status": "collected"}