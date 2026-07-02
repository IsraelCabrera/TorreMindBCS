import uuid
from datetime import datetime, timezone, date

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db_session
from app.core.rate_limiter import check_rate_limit
from app.core.fuzzy_search import find_same_day_visit
from app.models.tenant import Tenant
from app.models.tenant_contact import TenantContact
from app.models.user import User
from app.models.visitor import Visitor
from app.models.visit_record import VisitRecord
from app.websocket.manager import emit_visit_update
from app.whatsapp.handlers import notify_host
from app.config import settings

router = APIRouter()


class SelfRegisterRequest(BaseModel):
    name: str
    phone: str | None = None
    company: str | None = None
    host_name: str | None = None
    tenant_id: str | None = None
    purpose: str | None = None
    fax_number: str | None = None
    website: str | None = None


HONEYPOT_FIELDS = {"fax_number", "website"}


async def enforce_rate_limit(request: Request, action: str, max_req: int, window: int):
    ip = request.client.host if request.client else "unknown"
    ok = await check_rate_limit(ip, action, max_req, window)
    if not ok:
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes. Intenta de nuevo en un minuto.")


@router.get("/tenants")
async def list_tenants_public(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
):
    await enforce_rate_limit(request, "tenants", 30, 60)
    result = await db.execute(
        select(Tenant).where(Tenant.is_active == True).order_by(Tenant.name)
    )
    return [
        {"id": str(t.id), "name": t.name, "unit": t.unit}
        for t in result.scalars()
    ]


@router.post("/self-register")
async def self_register_public(
    request: Request,
    body: SelfRegisterRequest,
    db: AsyncSession = Depends(get_db_session),
):
    await enforce_rate_limit(request, "self-register", 5, 60)

    honeypot_triggered = any(getattr(body, f, None) for f in HONEYPOT_FIELDS)
    if honeypot_triggered:
        return {
            "success": True,
            "visit_id": None,
            "visitor_id": None,
            "visitor_name": body.name,
            "status": "pending",
        }

    if not body.name:
        raise HTTPException(status_code=422, detail="El nombre es obligatorio")

    conditions = [Visitor.is_active == True]
    if body.phone:
        conditions.append(Visitor.phone == body.phone)
    elif body.name:
        conditions.append(Visitor.name == body.name)
        conditions.append(Visitor.phone.is_(None))
    else:
        raise HTTPException(status_code=422, detail="El nombre es obligatorio")
    result = await db.execute(select(Visitor).where(*conditions).limit(1))
    visitor = result.scalar_one_or_none()

    if not visitor:
        visitor = Visitor(
            name=body.name,
            phone=body.phone,
            company=body.company,
        )
        db.add(visitor)
        await db.flush()

    # Check for same-day duplicate visit (fuzzy name match, not checked out)
    today = date.today()
    existing_visit = await find_same_day_visit(db, body.name, today)
    if existing_visit:
        # Update existing visit with new info
        existing_visit.purpose = body.purpose or existing_visit.purpose
        existing_visit.host_name = body.host_name or existing_visit.host_name
        if body.tenant_id:
            existing_visit.tenant_id = uuid.UUID(body.tenant_id)
        # Update tenant contact if host_name matches
        if body.host_name and body.host_name.strip():
            contact_result = await db.execute(
                select(TenantContact).where(
                    TenantContact.name.ilike(f"%{body.host_name.strip()}%")
                ).limit(1)
            )
            matched = contact_result.scalar_one_or_none()
            if matched:
                existing_visit.tenant_id = matched.tenant_id
                existing_visit.tenant_contact_id = matched.id
                existing_visit.host_name = matched.name
        
        await db.commit()
        await db.refresh(existing_visit, ["visitor", "tenant"])
        
        await emit_visit_update("visit:updated", {
            "id": str(existing_visit.id),
            "visitor_name": visitor.name,
            "status": existing_visit.status,
        })
        
        return {
            "success": True,
            "duplicate": True,
            "updated": True,
            "visit_id": str(existing_visit.id),
            "visitor_id": str(visitor.id),
            "visitor_name": visitor.name,
            "status": existing_visit.status,
            "check_in_at": existing_visit.check_in_at.isoformat(),
            "host_name": existing_visit.host_name,
            "purpose": existing_visit.purpose,
        }

    staff_user = (await db.execute(
        select(User).where(User.role == "lobby_staff").limit(1)
    )).scalar_one_or_none()
    if not staff_user:
        raise HTTPException(status_code=500, detail="No hay personal disponible para procesar el registro")

    now = datetime.now(timezone.utc)
    visit = VisitRecord(
        visitor_id=visitor.id,
        visitor_type="walk_in",
        host_name=body.host_name,
        purpose=body.purpose,
        created_by_user_id=staff_user.id,
        check_in_at=now,
        status="pending",
        escalation_state=None,
    )
    if body.tenant_id:
        visit.tenant_id = uuid.UUID(body.tenant_id)

    db.add(visit)
    await db.commit()

    whatsapp_disabled = not settings.whatsapp_phone_number_id or not settings.whatsapp_access_token
    should_auto_accept = whatsapp_disabled and settings.whatsapp_auto_accept

    host_name_raw = body.host_name
    if host_name_raw and host_name_raw.strip():
        result = await db.execute(
            select(TenantContact).where(
                TenantContact.name.ilike(f"%{host_name_raw.strip()}%")
            ).limit(1)
        )
        matched = result.scalar_one_or_none()
        if matched:
            visit.tenant_id = matched.tenant_id
            visit.tenant_contact_id = matched.id
            visit.host_name = matched.name
            await db.commit()
            if not should_auto_accept:
                await notify_host(db, visit)

    if should_auto_accept:
        visit.status = "approved"
        visit.acknowledged_at = datetime.now(timezone.utc)
        await db.commit()

    await db.refresh(visit, ["visitor", "tenant"])

    await emit_visit_update("visit:created", {
        "id": str(visit.id),
        "visitor_name": visitor.name,
        "status": visit.status,
    })

    return {
        "success": True,
        "visit_id": str(visit.id),
        "visitor_id": str(visitor.id),
        "visitor_name": visitor.name,
        "status": visit.status,
    }
