import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session, admin_only
from app.core.auth import hash_password
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
    for key, val in body.items():
        if hasattr(target, key):
            setattr(target, key, val)
    await db.commit()
    return {"status": "updated"}
