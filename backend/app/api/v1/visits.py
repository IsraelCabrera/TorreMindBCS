import uuid
from datetime import datetime, timezone, date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db_session, staff_or_admin, any_authenticated_user
from app.core.audit import log_audit
from app.core.fuzzy_search import find_same_day_visit
from app.models.visitor import Visitor
from app.models.visit_record import VisitRecord
from app.models.tenant_contact import TenantContact
from app.websocket.manager import emit_visit_update
from app.config import settings
from app.worker import schedule_escalation
from app.whatsapp.handlers import notify_host

router = APIRouter()


class CheckInRequest(BaseModel):
    visitor_id: str | None = None
    visitor_name: str | None = None
    visitor_phone: str | None = None
    visitor_company: str | None = None
    visitor_type: str = "walk_in"
    tenant_id: str | None = None
    host_name: str | None = None
    purpose: str | None = None
    work_order_ref: str | None = None
    notes: str | None = None


class VisitResponse(BaseModel):
    id: str
    visitor_name: str
    visitor_company: str | None
    visitor_type: str
    status: str
    host_name: str | None
    purpose: str | None
    check_in_at: str
    check_out_at: str | None
    tenant_name: str | None
    escalation_state: str | None


@router.post("/check-in")
async def check_in(
    body: CheckInRequest,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    if body.visitor_id:
        result = await db.execute(select(Visitor).where(Visitor.id == body.visitor_id))
        visitor = result.scalar_one_or_none()
        if not visitor:
            raise HTTPException(status_code=404, detail="Visitor not found")
    else:
        if not body.visitor_name:
            raise HTTPException(status_code=422, detail="Visitor name required")
        result = await db.execute(
            select(Visitor).where(Visitor.name == body.visitor_name, Visitor.phone == body.visitor_phone)
        )
        visitor = result.scalar_one_or_none()
        if not visitor:
            visitor = Visitor(name=body.visitor_name, phone=body.visitor_phone, company=body.visitor_company)
            db.add(visitor)
            await db.flush()

    # Check for same-day duplicate visit (fuzzy name match, not checked out)
    today = date.today()
    existing_visit = await find_same_day_visit(db, body.visitor_name, today)
    if existing_visit:
        # Update existing visit with new info
        existing_visit.purpose = body.purpose or existing_visit.purpose
        existing_visit.host_name = body.host_name or existing_visit.host_name
        existing_visit.visitor_type = body.visitor_type or existing_visit.visitor_type
        existing_visit.work_order_ref = body.work_order_ref or existing_visit.work_order_ref
        existing_visit.notes = body.notes or existing_visit.notes
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
        
        await log_audit(db, user["id"], "check_in", "visit", str(existing_visit.id),
                        details={"visitor_name": visitor.name, "visitor_type": body.visitor_type,
                                 "tenant_id": body.tenant_id, "host_name": body.host_name, "duplicate": True})
        await db.commit()
        await db.refresh(existing_visit, ["visitor", "tenant"])
        
        await emit_visit_update("visit:updated", {
            "id": str(existing_visit.id),
            "visitor_name": visitor.name,
            "status": existing_visit.status,
        })
        
        tenant_name = existing_visit.tenant.name if existing_visit.tenant else None
        return VisitResponse(
            id=str(existing_visit.id),
            visitor_name=visitor.name,
            visitor_company=visitor.company,
            visitor_type=existing_visit.visitor_type,
            status=existing_visit.status,
            host_name=existing_visit.host_name,
            purpose=existing_visit.purpose,
            check_in_at=existing_visit.check_in_at.isoformat(),
            check_out_at=existing_visit.check_out_at.isoformat() if existing_visit.check_out_at else None,
            tenant_name=tenant_name,
            escalation_state=existing_visit.escalation_state,
        )

    now = datetime.now(timezone.utc)
    visit = VisitRecord(
        visitor_id=visitor.id,
        visitor_type=body.visitor_type,
        host_name=body.host_name,
        purpose=body.purpose,
        work_order_ref=body.work_order_ref,
        notes=body.notes,
        created_by_user_id=user["id"],
        check_in_at=now,
        status="pending",
        escalation_state=None,
    )
    if body.tenant_id:
        visit.tenant_id = uuid.UUID(body.tenant_id)

    db.add(visit)
    await db.flush()
    await log_audit(db, user["id"], "check_in", "visit", str(visit.id),
                    details={"visitor_name": visitor.name, "visitor_type": body.visitor_type,
                             "tenant_id": body.tenant_id, "host_name": body.host_name})
    await db.commit()
    await db.refresh(visit, ["visitor", "tenant"])

    await emit_visit_update("visit:created", {
        "id": str(visit.id),
        "visitor_name": visitor.name,
        "status": visit.status,
    })

    whatsapp_disabled = not settings.whatsapp_phone_number_id or not settings.whatsapp_access_token
    if whatsapp_disabled and settings.whatsapp_auto_accept:
        visit.status = "approved"
        visit.acknowledged_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(visit, ["visitor", "tenant"])
    elif visit.tenant_id:
        await notify_host(db, visit)
        await schedule_escalation(str(visit.id), settings.host_timeout_seconds)

    tenant_name = visit.tenant.name if visit.tenant else None
    return VisitResponse(
        id=str(visit.id),
        visitor_name=visitor.name,
        visitor_company=visitor.company,
        visitor_type=visit.visitor_type,
        status=visit.status,
        host_name=visit.host_name,
        purpose=visit.purpose,
        check_in_at=visit.check_in_at.isoformat(),
        check_out_at=visit.check_out_at.isoformat() if visit.check_out_at else None,
        tenant_name=tenant_name,
        escalation_state=visit.escalation_state,
    )


@router.get("/active")
async def active_visits(
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(any_authenticated_user),
):
    stmt = (
        select(VisitRecord)
        .where(VisitRecord.check_out_at.is_(None), VisitRecord.status.in_(["pending", "approved", "escalated", "staff_decision", "denied"]))
        .options(selectinload(VisitRecord.visitor), selectinload(VisitRecord.tenant))
        .order_by(desc(VisitRecord.check_in_at))
    )
    result = await db.execute(stmt)
    visits = result.scalars().all()
    return [
        VisitResponse(
            id=str(v.id), visitor_name=v.visitor.name,
            visitor_company=v.visitor.company, visitor_type=v.visitor_type,
            status=v.status, host_name=v.host_name, purpose=v.purpose,
            check_in_at=v.check_in_at.isoformat(),
            check_out_at=v.check_out_at.isoformat() if v.check_out_at else None,
            tenant_name=v.tenant.name if v.tenant else None,
            escalation_state=v.escalation_state,
        )
        for v in visits
    ]


@router.get("/history")
async def visit_history(
    visitor_name: str | None = Query(None),
    tenant_name: str | None = Query(None),
    visitor_type: str | None = Query(None),
    status: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(any_authenticated_user),
):
    stmt = select(VisitRecord).options(selectinload(VisitRecord.visitor), selectinload(VisitRecord.tenant))
    conditions = []
    if visitor_name:
        conditions.append(VisitRecord.visitor.has(Visitor.name.ilike(f"%{visitor_name}%")))
    if tenant_name:
        conditions.append(VisitRecord.tenant.has(Tenant.name.ilike(f"%{tenant_name}%")))  # noqa: F821
    if visitor_type:
        conditions.append(VisitRecord.visitor_type == visitor_type)
    if status:
        conditions.append(VisitRecord.status == status)
    if conditions:
        stmt = stmt.where(and_(*conditions))
    stmt = stmt.order_by(desc(VisitRecord.check_in_at)).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    visits = result.scalars().all()
    return [
        VisitResponse(
            id=str(v.id), visitor_name=v.visitor.name,
            visitor_company=v.visitor.company, visitor_type=v.visitor_type,
            status=v.status, host_name=v.host_name, purpose=v.purpose,
            check_in_at=v.check_in_at.isoformat(),
            check_out_at=v.check_out_at.isoformat() if v.check_out_at else None,
            tenant_name=v.tenant.name if v.tenant else None,
            escalation_state=v.escalation_state,
        )
        for v in visits
    ]


@router.post("/{visit_id}/check-out")
async def check_out(
    visit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    result = await db.execute(select(VisitRecord).where(VisitRecord.id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404)
    visit.status = "checked_out"
    visit.check_out_at = datetime.now(timezone.utc)
    await log_audit(db, user["id"], "check_out", "visit", str(visit_id))
    await db.commit()
    await emit_visit_update("visit:updated", {"id": str(visit.id), "status": "checked_out"})
    return {"status": "checked_out"}


@router.post("/{visit_id}/confirm-denial")
async def confirm_denial(
    visit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    result = await db.execute(select(VisitRecord).where(VisitRecord.id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404)
    if visit.status != "denied":
        raise HTTPException(status_code=400, detail="Solo se puede confirmar visitas con estado 'denied'")
    visit.status = "checked_out"
    visit.check_out_at = datetime.now(timezone.utc)
    await log_audit(db, user["id"], "confirm_denial", "visit", str(visit_id))
    await db.commit()
    await emit_visit_update("visit:updated", {"id": str(visit.id), "status": "checked_out"})
    return {"status": "checked_out"}


@router.put("/{visit_id}")
async def update_visit(
    visit_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    result = await db.execute(select(VisitRecord).where(VisitRecord.id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404)
    for key, val in body.items():
        if hasattr(visit, key):
            setattr(visit, key, val)
    await log_audit(db, user["id"], "update", "visit", str(visit_id), details=body)
    await db.commit()
    await emit_visit_update("visit:updated", {"id": str(visit.id), "status": visit.status})
    return {"status": "updated"}


@router.post("/{visit_id}/escalate")
async def escalate_visit(
    visit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    result = await db.execute(select(VisitRecord).where(VisitRecord.id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404)
    visit.status = "escalated"
    visit.escalation_state = "staff_triggered"
    await log_audit(db, user["id"], "escalate", "visit", str(visit_id))
    await db.commit()
    await emit_visit_update("visit:updated", {"id": str(visit.id), "status": "escalated"})
    return {"status": "escalated"}


@router.post("/{visit_id}/notify-retry")
async def notify_retry(
    visit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    result = await db.execute(select(VisitRecord).where(VisitRecord.id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404)
    await log_audit(db, user["id"], "notify_retry", "visit", str(visit_id))
    await db.commit()
    return {"status": "notification_resent"}


from app.models.tenant import Tenant  # noqa: E402
