import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db_session, staff_or_admin, admin_only
from app.models.tenant import Tenant
from app.models.tenant_contact import TenantContact

router = APIRouter()


class TenantCreate(BaseModel):
    name: str
    unit: str | None = None
    floor: int | None = None
    primary_phone: str | None = None
    primary_email: str | None = None
    notification_channels: dict | None = None
    notes: str | None = None


class TenantResponse(BaseModel):
    id: str
    name: str
    unit: str | None
    floor: int | None
    primary_phone: str | None
    primary_email: str | None
    notification_channels: dict
    notes: str | None
    contacts: list = []


class ContactCreate(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None
    is_primary: bool = False
    is_backup: bool = False
    escalation_order: int = 0
    notification_channels: dict | None = None


class ContactResponse(BaseModel):
    id: str
    name: str
    phone: str | None
    email: str | None
    is_primary: bool
    is_backup: bool
    escalation_order: int
    notification_channels: dict


@router.get("")
async def list_tenants(
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    result = await db.execute(
        select(Tenant).where(Tenant.is_active == True).options(selectinload(Tenant.contacts))
    )
    tenants = result.scalars().all()
    return [
        TenantResponse(
            id=str(t.id), name=t.name, unit=t.unit, floor=t.floor,
            primary_phone=t.primary_phone, primary_email=t.primary_email,
            notification_channels=t.notification_channels, notes=t.notes,
            contacts=[ContactResponse(id=str(c.id), name=c.name, phone=c.phone, email=c.email,
                       is_primary=c.is_primary, is_backup=c.is_backup,
                       escalation_order=c.escalation_order,
                       notification_channels=c.notification_channels) for c in t.contacts],
        )
        for t in tenants
    ]


@router.post("")
async def create_tenant(
    body: TenantCreate,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(admin_only),
):
    tenant = Tenant(
        name=body.name, unit=body.unit, floor=body.floor,
        primary_phone=body.primary_phone, primary_email=body.primary_email,
        notification_channels=body.notification_channels or {"whatsapp": True, "sms": False, "email": False},
        notes=body.notes,
    )
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return TenantResponse(id=str(tenant.id), name=tenant.name, unit=tenant.unit, floor=tenant.floor,
                          primary_phone=tenant.primary_phone, primary_email=tenant.primary_email,
                          notification_channels=tenant.notification_channels, notes=tenant.notes)


@router.get("/{tenant_id}")
async def get_tenant(
    tenant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id, Tenant.is_active == True).options(selectinload(Tenant.contacts))
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404)
    return TenantResponse(
        id=str(tenant.id), name=tenant.name, unit=tenant.unit, floor=tenant.floor,
        primary_phone=tenant.primary_phone, primary_email=tenant.primary_email,
        notification_channels=tenant.notification_channels, notes=tenant.notes,
        contacts=[ContactResponse(id=str(c.id), name=c.name, phone=c.phone, email=c.email,
                   is_primary=c.is_primary, is_backup=c.is_backup,
                   escalation_order=c.escalation_order,
                   notification_channels=c.notification_channels) for c in tenant.contacts],
    )


@router.put("/{tenant_id}")
async def update_tenant(
    tenant_id: uuid.UUID,
    body: TenantCreate,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(admin_only),
):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id, Tenant.is_active == True))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404)
    for key, val in body.model_dump(exclude_none=True).items():
        setattr(tenant, key, val)
    await db.commit()
    return {"status": "updated"}


@router.get("/{tenant_id}/contacts")
async def list_contacts(
    tenant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    result = await db.execute(
        select(TenantContact).where(TenantContact.tenant_id == tenant_id).order_by(TenantContact.escalation_order)
    )
    contacts = result.scalars().all()
    return [ContactResponse(id=str(c.id), name=c.name, phone=c.phone, email=c.email,
                            is_primary=c.is_primary, is_backup=c.is_backup,
                            escalation_order=c.escalation_order,
                            notification_channels=c.notification_channels) for c in contacts]


@router.post("/{tenant_id}/contacts")
async def create_contact(
    tenant_id: uuid.UUID,
    body: ContactCreate,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(admin_only),
):
    contact = TenantContact(
        tenant_id=tenant_id,
        name=body.name,
        phone=body.phone,
        email=body.email,
        is_primary=body.is_primary,
        is_backup=body.is_backup,
        escalation_order=body.escalation_order,
        notification_channels=body.notification_channels or {"whatsapp": True, "sms": False, "email": False},
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return ContactResponse(id=str(contact.id), name=contact.name, phone=contact.phone,
                           email=contact.email, is_primary=contact.is_primary,
                           is_backup=contact.is_backup, escalation_order=contact.escalation_order,
                           notification_channels=contact.notification_channels)


@router.put("/{tenant_id}/contacts/{contact_id}")
async def update_contact(
    tenant_id: uuid.UUID,
    contact_id: uuid.UUID,
    body: ContactCreate,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(admin_only),
):
    result = await db.execute(select(TenantContact).where(TenantContact.id == contact_id, TenantContact.tenant_id == tenant_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404)
    for key, val in body.model_dump(exclude_none=True).items():
        setattr(contact, key, val)
    await db.commit()
    return {"status": "updated"}


@router.delete("/{tenant_id}/contacts/{contact_id}")
async def delete_contact(
    tenant_id: uuid.UUID,
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(admin_only),
):
    result = await db.execute(select(TenantContact).where(TenantContact.id == contact_id, TenantContact.tenant_id == tenant_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404)
    await db.delete(contact)
    await db.commit()
    return {"status": "deleted"}
