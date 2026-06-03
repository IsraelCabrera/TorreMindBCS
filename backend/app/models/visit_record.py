import uuid
from datetime import datetime
from typing import Literal

from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base, TimestampMixin

VisitorType = Literal[
    "building_staff", "tenant_employee", "tenant_visitor",
    "delivery", "vendor", "prospective_tenant",
    "government", "walk_in",
]
VisitStatus = Literal[
    "pending", "approved", "denied", "escalated",
    "staff_decision", "checked_out",
]


class VisitRecord(Base, TimestampMixin):
    __tablename__ = "visit_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visitor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("visitors.id"), nullable=False)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), default=None)
    tenant_contact_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tenant_contacts.id"), default=None)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    visitor_type: Mapped[VisitorType] = mapped_column(String(30))
    status: Mapped[VisitStatus] = mapped_column(String(20), default="pending")
    escalation_state: Mapped[str | None] = mapped_column(String(30), default=None)
    host_name: Mapped[str | None] = mapped_column(String(255))
    purpose: Mapped[str | None] = mapped_column(String(500))
    check_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    qr_token: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    work_order_ref: Mapped[str | None] = mapped_column(String(255))
    photo_url: Mapped[str | None] = mapped_column(String(1024))
    notes: Mapped[str | None] = mapped_column(Text)
    notification_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    escalated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    acknowledged_by_contact_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tenant_contacts.id"), default=None)
    override_reason: Mapped[str | None] = mapped_column(Text)

    visitor = relationship("Visitor", lazy="joined")
    tenant = relationship("Tenant", lazy="joined")
    tenant_contact = relationship("TenantContact", lazy="joined", foreign_keys=[tenant_contact_id])
    acknowledged_by = relationship("TenantContact", lazy="joined", foreign_keys=[acknowledged_by_contact_id])
    created_by = relationship("User", lazy="joined")

    notifications = relationship("NotificationLog", back_populates="visit", lazy="selectin")
