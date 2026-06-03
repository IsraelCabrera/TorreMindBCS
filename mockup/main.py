import logging
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import FastAPI, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from log import setup_logging

logger = setup_logging()

HERE = Path(__file__).parent

app = FastAPI(title="WhatsApp Mockup — Torre Mind")

messages: list[dict] = []

TEMPLATE_BUTTON_LABELS = {
    "host_acknowledgment": {"approve": "✅ Que suba", "deny": "❌ No disponible"},
    "host_escalated": {"approve": "✅ Que suba", "deny": "❌ No disponible"},
    "package_arrival": {},
}

DEFAULT_VISITOR_PHONE = "+526650000001"


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s → %s (%.0fms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed,
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return HTMLResponse(status_code=500, content="Internal Server Error")


def add_message(chat_type: str, direction: str, from_: str, to: str,
                msg_type: str, body: str = "", buttons: list | None = None,
                template_name: str = "", raw: dict | None = None) -> str:
    mid = f"msg_{uuid.uuid4().hex[:8]}"
    messages.append({
        "id": mid,
        "chat_type": chat_type,
        "direction": direction,
        "from": from_,
        "to": to,
        "type": msg_type,
        "template_name": template_name,
        "body": body,
        "buttons": buttons or [],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "raw": raw,
    })
    logger.debug("Message stored [%s|%s] %s: %s", chat_type, direction, msg_type, body[:80] if body else "(no body)")
    return mid


@app.on_event("startup")
async def startup():
    logger.info("WhatsApp Mockup starting on :9090")


@app.on_event("shutdown")
async def shutdown():
    logger.info("WhatsApp Mockup shutting down")


@app.get("/api/messages")
async def get_messages(chat_type: str = Query("tenant")):
    filtered = [m for m in messages if m["chat_type"] == chat_type]
    logger.debug("GET /api/messages?chat_type=%s → %d messages", chat_type, len(filtered))
    return filtered


@app.delete("/api/messages")
async def clear_messages(chat_type: str | None = Query(None)):
    global messages
    if chat_type:
        before = len(messages)
        messages = [m for m in messages if m["chat_type"] != chat_type]
        cleared = before - len(messages)
        logger.info("Cleared %d messages for chat_type=%s", cleared, chat_type)
    else:
        cleared = len(messages)
        messages.clear()
        logger.info("Cleared all %d messages", cleared)
    return {"status": "ok"}


@app.post("/v21.0/{phone_number_id}/messages")
async def mock_meta_api(phone_number_id: str, request: Request):
    body = await request.json()
    to = body.get("to", "+521234567890")
    msg_type = body.get("type", "")
    template = body.get("template", {})
    template_name = template.get("name", "")

    logger.info("Meta API call: template=%s to=%s", template_name or "(text)", to)

    body_text = ""
    buttons: list[dict] = []

    for comp in template.get("components", []):
        ctype = comp.get("type", "")
        if ctype == "body":
            params = comp.get("parameters", [])
            parts = [p.get("text", "") for p in params if p.get("type") == "text"]
            if parts:
                body_text = "\n".join(parts)
        elif ctype == "button":
            for p in comp.get("parameters", []):
                if p.get("type") == "payload":
                    payload = p.get("payload", "")
                    label = payload
                    for action, lbl in TEMPLATE_BUTTON_LABELS.get(template_name, {}).items():
                        if payload.startswith(action):
                            label = lbl
                            break
                    buttons.append({"label": label, "payload": payload})

    chat_type = "visitor" if to.startswith("+52665000000") else "tenant"
    mid = add_message(
        chat_type=chat_type, direction="in", from_=phone_number_id, to=to,
        msg_type=msg_type, body=body_text, buttons=buttons,
        template_name=template_name, raw=body,
    )

    return {
        "messaging_product": "whatsapp",
        "contacts": [{"input": to, "wa_id": to}],
        "messages": [{"id": mid}],
    }


@app.post("/api/send-tenant-reply")
async def send_tenant_reply(request: Request):
    body = await request.json()
    from_number = body.get("from", "")
    payload = body.get("payload", "")
    webhook_url = body.get("webhook_url", "http://localhost:8000/webhooks/whatsapp")

    logger.info("Tenant reply: from=%s payload=%s", from_number, payload)

    add_message(
        chat_type="tenant", direction="out", from_=from_number,
        to="Torre Mind", msg_type="button_reply",
        body=f"Botón: {payload.split('|')[0]}",
        raw=body,
    )

    webhook_body = {
        "entry": [{"changes": [{"value": {
            "messages": [{"from": from_number, "type": "button_reply", "button": {"payload": payload}}],
        }}]}],
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(webhook_url, json=webhook_body)
        logger.info("Webhook forwarded to %s → %s", webhook_url, resp.status_code)
        return {"status": "sent", "vlms_status": resp.status_code}


@app.post("/api/send-visitor-message")
async def send_visitor_message(request: Request):
    body = await request.json()
    from_number = body.get("from", DEFAULT_VISITOR_PHONE)
    text = body.get("text", "")
    webhook_url = body.get("webhook_url", "http://localhost:8000/webhooks/whatsapp")

    logger.info("Visitor message: from=%s text=%s", from_number, text[:100])

    add_message(
        chat_type="visitor", direction="out", from_=from_number,
        to="Torre Mind", msg_type="text", body=text,
        raw=body,
    )

    webhook_body = {
        "entry": [{"changes": [{"value": {
            "messages": [{"from": from_number, "type": "text", "text": {"body": text}}],
        }}]}],
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(webhook_url, json=webhook_body)
        logger.info("Webhook forwarded to %s → %s", webhook_url, resp.status_code)
        return {"status": "sent", "vlms_status": resp.status_code}


app.mount("/static", StaticFiles(directory=str(HERE / "static")), name="static")


@app.get("/")
async def chat_ui():
    html = (HERE / "static" / "index.html").read_text()
    return HTMLResponse(html)
