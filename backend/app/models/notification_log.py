import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models.base import Base, TimestampMixin


class NotificationLog(Base, TimestampMixin):
    __tablename__ = "notification_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("visit_records.id"), default=None)
    delivery_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("delivery_records.id"), default=None)
    channel: Mapped[str] = mapped_column(String(20))
    template_name: Mapped[str] = mapped_column(String(255))
    recipient: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20))
    meta_message_id: Mapped[str | None] = mapped_column(String(255))
    response_data: Mapped[dict | None] = mapped_column(JSONB, default=None)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    visit = relationship("VisitRecord", back_populates="notifications")
