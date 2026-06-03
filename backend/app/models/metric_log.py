import uuid
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, BigInteger
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models.base import Base


class MetricLog(Base):
    __tablename__ = "metric_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), default=None)
    action: Mapped[str] = mapped_column(String(50), index=True)
    target_type: Mapped[str | None] = mapped_column(String(50))
    target_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), default=None)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_ms: Mapped[int] = mapped_column(BigInteger)
    extra_metadata: Mapped[dict | None] = mapped_column(JSONB, default=None)
