import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.deps import get_db_session, staff_or_admin, any_authenticated_user
from app.core.audit import log_audit
from app.models.visitor import Visitor
from app.models.visit_record import VisitRecord
from app.models.tenant import Tenant

router = APIRouter()


class VisitorCreate(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None
    company: str | None = None
    notes: str | None = None


class VisitorResponse(BaseModel):
    id: str
    name: str
    phone: str | None
    email: str | None
    company: str | None
    notes: str | None
    photo_url: str | None
    created_at: str
    last_visit_at: str | None = None
    last_host_name: str | None = None
    last_tenant_name: str | None = None


async def _get_latest_visits(db: AsyncSession, visitor_ids: list[uuid.UUID]) -> dict[uuid.UUID, dict]:
    if not visitor_ids:
        return {}
    stmt = (
        select(VisitRecord)
        .options(joinedload(VisitRecord.tenant))
        .where(VisitRecord.visitor_id.in_(visitor_ids))
        .order_by(VisitRecord.visitor_id, VisitRecord.check_in_at.desc())
        .distinct(VisitRecord.visitor_id)
    )
    result = await db.execute(stmt)
    rows = result.unique().scalars().all()
    return {
        r.visitor_id: {
            "last_visit_at": r.check_in_at.isoformat(),
            "last_host_name": r.host_name,
            "last_tenant_name": r.tenant.name if r.tenant else None,
        }
        for r in rows
    }


@router.get("")
async def list_visitors(
    q: str | None = Query(None),
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(any_authenticated_user),
):
    stmt = select(Visitor).where(Visitor.is_active == True)
    if q:
        stmt = stmt.where(
            or_(
                Visitor.name.ilike(f"%{q}%"),
                Visitor.phone.ilike(f"%{q}%"),
                Visitor.company.ilike(f"%{q}%"),
            )
        )
    stmt = stmt.order_by(Visitor.created_at.desc()).limit(20)
    result = await db.execute(stmt)
    visitors = result.scalars().all()
    latest = await _get_latest_visits(db, [v.id for v in visitors])
    return [
        VisitorResponse(
            id=str(v.id), name=v.name, phone=v.phone, email=v.email,
            company=v.company, notes=v.notes, photo_url=v.photo_url,
            created_at=v.created_at.isoformat(),
            last_visit_at=latest[v.id]["last_visit_at"] if v.id in latest else None,
            last_host_name=latest[v.id]["last_host_name"] if v.id in latest else None,
            last_tenant_name=latest[v.id]["last_tenant_name"] if v.id in latest else None,
        )
        for v in visitors
    ]


@router.post("")
async def create_visitor(
    body: VisitorCreate,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    visitor = Visitor(name=body.name, phone=body.phone, email=body.email, company=body.company, notes=body.notes)
    db.add(visitor)
    await db.flush()
    await log_audit(db, user["id"], "create", "visitor", str(visitor.id),
                    details={"name": body.name, "phone": body.phone, "company": body.company})
    await db.commit()
    await db.refresh(visitor)
    return VisitorResponse(
        id=str(visitor.id), name=visitor.name, phone=visitor.phone,
        email=visitor.email, company=visitor.company, notes=visitor.notes,
        photo_url=visitor.photo_url, created_at=visitor.created_at.isoformat(),
    )


@router.get("/{visitor_id}")
async def get_visitor(
    visitor_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(any_authenticated_user),
):
    result = await db.execute(select(Visitor).where(Visitor.id == visitor_id, Visitor.is_active == True))
    visitor = result.scalar_one_or_none()
    if not visitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return VisitorResponse(
        id=str(visitor.id), name=visitor.name, phone=visitor.phone,
        email=visitor.email, company=visitor.company, notes=visitor.notes,
        photo_url=visitor.photo_url, created_at=visitor.created_at.isoformat(),
    )


@router.put("/{visitor_id}")
async def update_visitor(
    visitor_id: uuid.UUID,
    body: VisitorCreate,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    result = await db.execute(select(Visitor).where(Visitor.id == visitor_id, Visitor.is_active == True))
    visitor = result.scalar_one_or_none()
    if not visitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    visitor.name = body.name
    visitor.phone = body.phone
    visitor.email = body.email
    visitor.company = body.company
    visitor.notes = body.notes
    await log_audit(db, user["id"], "update", "visitor", str(visitor_id),
                    details={"name": body.name, "phone": body.phone, "company": body.company})
    await db.commit()
    await db.refresh(visitor)
    return VisitorResponse(
        id=str(visitor.id), name=visitor.name, phone=visitor.phone,
        email=visitor.email, company=visitor.company, notes=visitor.notes,
        photo_url=visitor.photo_url, created_at=visitor.created_at.isoformat(),
    )
