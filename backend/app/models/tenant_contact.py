import uuid

from sqlalchemy import String, Boolean, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models.base import Base, TimestampMixin


class TenantContact(Base, TimestampMixin):
    __tablename__ = "tenant_contacts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(255))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    is_backup: Mapped[bool] = mapped_column(Boolean, default=False)
    escalation_order: Mapped[int] = mapped_column(Integer, default=0)
    notification_channels: Mapped[dict] = mapped_column(JSONB, default={"whatsapp": True, "sms": False, "email": False})

    tenant = relationship("Tenant", back_populates="contacts")
