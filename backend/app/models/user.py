import uuid
from datetime import datetime
from typing import Literal

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base, TimestampMixin, SoftDeleteMixin

UserRole = Literal["lobby_staff", "admin", "security"]


class User(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(String(20), default="lobby_staff")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
