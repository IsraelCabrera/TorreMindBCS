import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base, TimestampMixin


class DeliveryRecord(Base, TimestampMixin):
    __tablename__ = "delivery_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    courier: Mapped[str] = mapped_column(String(255))
    recipient_name: Mapped[str] = mapped_column(String(255))
    recipient_phone: Mapped[str | None] = mapped_column(String(50))
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), default=None)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    photo_url: Mapped[str | None] = mapped_column(String(1024))
    check_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    collected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    notification_sent: Mapped[bool] = mapped_column(default=False)
