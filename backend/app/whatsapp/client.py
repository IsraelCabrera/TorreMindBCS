import httpx

from app.config import settings

GRAPH_API_URL = f"{settings.whatsapp_api_base_url}/{settings.whatsapp_api_version}"


async def send_whatsapp_message(to: str, payload: dict) -> dict:
    url = f"{GRAPH_API_URL}/{settings.whatsapp_phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {settings.whatsapp_access_token}",
        "Content-Type": "application/json",
    }
    body = {"messaging_product": "whatsapp", "recipient_type": "individual", "to": to, **payload}
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, json=body, headers=headers)
        resp.raise_for_status()
        return resp.json()


async def send_template_message(to: str, template_name: str, language_code: str = "es", components: list | None = None):
    payload = {
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language_code},
        },
    }
    if components:
        payload["template"]["components"] = components
    return await send_whatsapp_message(to, payload)


async def send_text_message(to: str, text: str):
    return await send_whatsapp_message(to, {"type": "text", "text": {"preview_url": False, "body": text}})
