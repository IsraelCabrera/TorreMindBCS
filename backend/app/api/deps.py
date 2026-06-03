from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.permissions import get_current_user, require_role


async def get_db_session():
    async for session in get_db():
        yield session


def admin_only(user: dict = Depends(require_role("admin"))):
    return user


def staff_or_admin(user: dict = Depends(require_role("lobby_staff"))):
    return user
