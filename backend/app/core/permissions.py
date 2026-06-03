from functools import wraps
from typing import Literal

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.auth import decode_token

security = HTTPBearer()

UserRole = Literal["lobby_staff", "admin", "security"]

ROLE_HIERARCHY: dict[UserRole, int] = {
    "security": 1,
    "lobby_staff": 2,
    "admin": 3,
}


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return {"id": payload["sub"], "role": payload["role"]}


def require_role(min_role: UserRole):
    def checker(user: dict = Depends(get_current_user)):
        if ROLE_HIERARCHY.get(user["role"], 0) < ROLE_HIERARCHY[min_role]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return checker
