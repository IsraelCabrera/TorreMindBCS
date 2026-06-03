import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session, staff_or_admin, admin_only
from app.models.blocklist import BlocklistEntry

router = APIRouter()


class BlocklistCreate(BaseModel):
    name: str
    phone: str | None = None
    reason: str | None = None


class BlocklistResponse(BaseModel):
    id: str
    name: str
    phone: str | None
    reason: str | None


class BlocklistCheck(BaseModel):
    name: str
    phone: str | None = None


class BlocklistCheckResult(BaseModel):
    matched: bool
    entry: BlocklistResponse | None = None


@router.get("")
async def list_blocklist(
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    result = await db.execute(select(BlocklistEntry).order_by(BlocklistEntry.created_at.desc()))
    entries = result.scalars().all()
    return [BlocklistResponse(id=str(e.id), name=e.name, phone=e.phone, reason=e.reason) for e in entries]


@router.post("")
async def add_blocklist_entry(
    body: BlocklistCreate,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(admin_only),
):
    entry = BlocklistEntry(name=body.name, phone=body.phone, reason=body.reason, added_by_user_id=user["id"])
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return BlocklistResponse(id=str(entry.id), name=entry.name, phone=entry.phone, reason=entry.reason)


@router.delete("/{entry_id}")
async def remove_blocklist_entry(
    entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(admin_only),
):
    result = await db.execute(select(BlocklistEntry).where(BlocklistEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404)
    await db.delete(entry)
    await db.commit()
    return {"status": "deleted"}


@router.post("/check")
async def check_blocklist(
    body: BlocklistCheck,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(staff_or_admin),
):
    stmt = select(BlocklistEntry).where(
        or_(
            BlocklistEntry.name.ilike(body.name),
            BlocklistEntry.phone == body.phone if body.phone else False,
        )
    )
    result = await db.execute(stmt)
    entry = result.scalar_one_or_none()
    if entry:
        return BlocklistCheckResult(matched=True, entry=BlocklistResponse(id=str(entry.id), name=entry.name, phone=entry.phone, reason=entry.reason))
    return BlocklistCheckResult(matched=False)
