import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.api.deps import get_db_session
from app.models.visit_record import VisitRecord
from app.models.tenant_contact import TenantContact
from app.websocket.manager import emit_visit_update

router = APIRouter()


@router.get("/whatsapp")
async def verify_webhook(request: Request):
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    if mode == "subscribe" and token == settings.whatsapp_webhook_verify_token:
        return PlainTextResponse(challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/whatsapp")
async def inbound_webhook(request: Request, db: AsyncSession = Depends(get_db_session)):
    body = await request.json()
    for entry in body.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for msg in value.get("messages", []):
                from_number = msg.get("from")
                msg_type = msg.get("type")

                if msg_type == "button_reply":
                    button = msg.get("button", {})
                    payload = button.get("payload", "")
                    await handle_button_reply(db, from_number, payload)
                elif msg_type == "text":
                    text = msg.get("text", {}).get("body", "")
                    await handle_text_message(db, from_number, text)

    return {"status": "ok"}


async def handle_button_reply(db: AsyncSession, from_number: str, payload: str):
    parts = payload.split("|")
    action = parts[0]
    visit_id_str = parts[1] if len(parts) > 1 else None
    if not visit_id_str:
        return

    try:
        visit_uuid = uuid.UUID(visit_id_str)
    except ValueError:
        return

    result = await db.execute(select(VisitRecord).where(VisitRecord.id == visit_uuid))
    visit = result.scalar_one_or_none()
    if not visit:
        return

    if action == "approve":
        result = await db.execute(
            select(TenantContact).where(
                TenantContact.phone == from_number,
                TenantContact.tenant_id == visit.tenant_id,
            ).limit(1)
        )
        contact = result.scalar_one_or_none()

        visit.status = "approved"
        visit.acknowledged_at = datetime.now(timezone.utc)
        if contact:
            visit.acknowledged_by_contact_id = contact.id
        await db.commit()
        await emit_visit_update("visit:updated", {"id": visit_id_str, "status": "approved"})

    elif action == "deny":
        visit.status = "denied"
        visit.acknowledged_at = datetime.now(timezone.utc)
        await db.commit()
        await emit_visit_update("visit:updated", {"id": visit_id_str, "status": "denied"})


async def handle_text_message(db: AsyncSession, from_number: str, text: str):
    pass
