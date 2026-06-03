import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models.base import Base, TimestampMixin


class WhatsAppSession(Base, TimestampMixin):
    __tablename__ = "whatsapp_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone_number: Mapped[str] = mapped_column(String(50), index=True)
    session_data: Mapped[dict] = mapped_column(JSONB, default=dict)
    flow_state: Mapped[str | None] = mapped_column(String(50))
    current_step: Mapped[str | None] = mapped_column(String(100))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
