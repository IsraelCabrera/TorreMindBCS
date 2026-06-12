import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session, admin_only
from app.core.audit import log_audit
from app.core.auth import hash_password
from app.models.audit_log import AuditLog
from app.models.user import User

router = APIRouter()


class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "lobby_staff"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(admin_only),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [UserResponse(id=str(u.id), email=u.email, name=u.name, role=u.role, is_active=u.is_active) for u in users]


@router.post("/users")
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(admin_only),
):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    new_user = User(email=body.email, password_hash=hash_password(body.password), name=body.name, role=body.role)
    db.add(new_user)
    await db.flush()
    await log_audit(db, user["id"], "create", "user", str(new_user.id),
                    details={"email": body.email, "name": body.name, "role": body.role})
    await db.commit()
    await db.refresh(new_user)
    return UserResponse(id=str(new_user.id), email=new_user.email, name=new_user.name, role=new_user.role, is_active=new_user.is_active)


@router.put("/users/{user_id}")
async def update_user(
    user_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(admin_only),
):
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404)
    if "password" in body:
        body["password_hash"] = hash_password(body.pop("password"))
    before = {}
    for key in body:
        if hasattr(target, key):
            before[key] = getattr(target, key)
    for key, val in body.items():
        if hasattr(target, key):
            setattr(target, key, val)
    await log_audit(db, user["id"], "update", "user", str(user_id),
                    details={"changes": {k: {"before": before.get(k), "after": body[k]} for k in body if before.get(k) != body[k]}})
    await db.commit()
    return {"status": "updated"}


@router.delete("/users/{user_id}")
async def deactivate_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(admin_only),
):
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404)
    target.is_active = False
    await log_audit(db, user["id"], "deactivate", "user", str(user_id),
                    details={"email": target.email, "name": target.name})
    await db.commit()
    return {"status": "deactivated"}


@router.get("/audit-log")
async def list_audit_logs(
    db: AsyncSession = Depends(get_db_session),
    user: dict = Depends(admin_only),
):
    result = await db.execute(select(AuditLog).order_by(desc(AuditLog.created_at)).limit(200))
    logs = result.scalars().all()
    return [
        {
            "id": str(log.id),
            "user_id": str(log.user_id) if log.user_id else None,
            "action": log.action,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
