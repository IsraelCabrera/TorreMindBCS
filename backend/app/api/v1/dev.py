import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.api.deps import get_db_session
from app.models.notification_log import NotificationLog
from app.models.visit_record import VisitRecord
from app.models.visitor import Visitor
from app.models.user import User
from app.whatsapp.webhook import handle_button_reply
from app.whatsapp.templates import TEMPLATES
from app.whatsapp.client import build_whatsapp_payload
from app.websocket.manager import emit_visit_update

router = APIRouter()


def dev_only(request: Request):
    if settings.environment != "dev":
        raise HTTPException(status_code=404, detail="Not found")
    if request.headers.get("X-Dev-Mode") != "true":
        raise HTTPException(status_code=403, detail="Dev mode header required")


@router.get("/dev/whatsapp/templates")
async def get_templates(request: Request):
    dev_only(request)
    return {"templates": TEMPLATES}


class SendTestRequest(BaseModel):
    template_name: str
    to: str = "+526641234567"
    language_code: str = "es"
    variables: dict = {}


@router.post("/dev/whatsapp/send-test")
async def send_test(request: Request, body: SendTestRequest):
    dev_only(request)

    template = TEMPLATES.get(body.template_name)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    components = template["components"]
    for comp in components:
        if comp["type"] == "BODY" and "text" in comp:
            text = comp["text"]
            for key, value in body.variables.items():
                text = text.replace(f"{{{{{key}}}}}", str(value))
            comp["text"] = text
        elif comp["type"] == "BODY" and "parameters" in comp:
            for param in comp["parameters"]:
                if param["type"] == "text" and "text" in param:
                    param["text"] = param["text"].format(**body.variables)

    payload = build_whatsapp_payload(body.to, body.template_name, body.language_code, components)
    return {"payload": payload, "template": template}


class SimulateButtonReplyRequest(BaseModel):
    visit_id: str
    action: str
    from_number: str = "+526641112200"


@router.post("/dev/whatsapp/simulate-button-reply")
async def simulate_button_reply(request: Request, body: SimulateButtonReplyRequest, db: AsyncSession = Depends(get_db_session)):
    dev_only(request)

    try:
        visit_uuid = uuid.UUID(body.visit_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid visit_id")

    result = await db.execute(select(VisitRecord).where(VisitRecord.id == visit_uuid))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    payload = f"{body.action}|{body.visit_id}"
    await handle_button_reply(db, body.from_number, payload)

    return {"status": "ok", "visit_id": body.visit_id, "action": body.action}


class SimulateTextMessageRequest(BaseModel):
    phone: str
    text: str
    tenant_id: Optional[str] = None


@router.post("/dev/whatsapp/simulate-text-message")
async def simulate_text_message(request: Request, body: SimulateTextMessageRequest, db: AsyncSession = Depends(get_db_session)):
    dev_only(request)

    from_number = body.phone
    text = body.text

    result = await db.execute(select(Visitor).where(Visitor.phone == from_number))
    visitor = result.scalar_one_or_none()

    if not visitor:
        visitor = Visitor(name="Visitante WhatsApp", phone=from_number)
        db.add(visitor)
        await db.flush()

    staff_user = (await db.execute(select(User).where(User.role == "lobby_staff").limit(1))).scalar_one_or_none()
    if not staff_user:
        raise HTTPException(status_code=500, detail="No staff user found")

    tenant_uuid = None
    if body.tenant_id:
        try:
            tenant_uuid = uuid.UUID(body.tenant_id)
        except ValueError:
            pass

    now = datetime.now(timezone.utc)
    visit = VisitRecord(
        visitor_id=visitor.id,
        visitor_type="walk_in",
        host_name=text,
        purpose="WhatsApp self check-in",
        created_by_user_id=staff_user.id,
        check_in_at=now,
        status="pending",
        escalation_state=None,
    )
    if tenant_uuid:
        visit.tenant_id = tenant_uuid

    db.add(visit)
    await db.commit()
    await db.refresh(visit, ["visitor", "tenant"])

    await emit_visit_update("visit:created", {
        "id": str(visit.id),
        "visitor_name": visitor.name,
        "status": visit.status,
    })

    if visit.tenant_id:
        from app.whatsapp.handlers import notify_host
        from app.worker import schedule_escalation
        await notify_host(db, visit)
        await schedule_escalation(str(visit.id), settings.host_timeout_seconds)

    return {"status": "ok", "visit_id": str(visit.id), "visitor_name": visitor.name}


@router.get("/dev/whatsapp/messages")
async def get_dev_messages(request: Request, db: AsyncSession = Depends(get_db_session)):
    dev_only(request)

    result = await db.execute(
        select(NotificationLog)
        .where(NotificationLog.status == "dev_mock")
        .order_by(desc(NotificationLog.sent_at))
        .limit(100)
    )
    logs = result.scalars().all()

    return {
        "messages": [
            {
                "id": str(log.id),
                "visit_id": str(log.visit_id) if log.visit_id else None,
                "delivery_id": str(log.delivery_id) if log.delivery_id else None,
                "template_name": log.template_name,
                "recipient": log.recipient,
                "status": log.status,
                "response_data": log.response_data,
                "meta_message_id": log.meta_message_id,
                "sent_at": log.sent_at.isoformat() if log.sent_at else None,
            }
            for log in logs
        ]
    }


@router.delete("/dev/whatsapp/messages")
async def clear_dev_messages(request: Request, db: AsyncSession = Depends(get_db_session)):
    dev_only(request)

    await db.execute(NotificationLog.__table__.delete().where(NotificationLog.status == "dev_mock"))
    await db.commit()

    return {"status": "cleared"}