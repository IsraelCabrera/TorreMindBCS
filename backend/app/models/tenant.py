import uuid

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models.base import Base, TimestampMixin, SoftDeleteMixin


class Tenant(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), index=True)
    unit: Mapped[str | None] = mapped_column(String(50))
    floor: Mapped[int | None] = mapped_column(default=None)
    primary_phone: Mapped[str | None] = mapped_column(String(50))
    primary_email: Mapped[str | None] = mapped_column(String(255))
    notification_channels: Mapped[dict] = mapped_column(JSONB, default={"whatsapp": True, "sms": False, "email": False})
    notes: Mapped[str | None] = mapped_column(Text)

    contacts = relationship("TenantContact", back_populates="tenant", lazy="selectin", cascade="all, delete-orphan")
