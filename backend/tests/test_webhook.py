import pytest

from app.config import settings


@pytest.mark.asyncio
async def test_webhook_verification_success(client):
    token = settings.whatsapp_webhook_verify_token
    resp = await client.get(f"/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token={token}&hub.challenge=challenge_123")
    assert resp.status_code == 200
    assert resp.text == "challenge_123"


@pytest.mark.asyncio
async def test_webhook_verification_failure(client):
    resp = await client.get("/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_webhook_verification_no_mode(client):
    resp = await client.get("/webhooks/whatsapp?hub.verify_token=token&hub.challenge=abc")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_inbound_webhook_empty(client):
    resp = await client.post("/webhooks/whatsapp", json={})
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_inbound_webhook_unknown_structure(client):
    resp = await client.post("/webhooks/whatsapp", json={
        "entry": [{"changes": [{"value": {"messages": []}}]}],
    })
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_inbound_webhook_button_reply_approve(client, staff_headers, test_tenant_id, admin_headers):
    create = await client.post("/api/v1/tenants", json={"name": "Hook Corp"}, headers=admin_headers)
    tenant_id = create.json()["id"]
    await client.post(f"/api/v1/tenants/{tenant_id}/contacts", json={
        "name": "Hook Contact", "phone": "+526641112200", "is_primary": True,
    }, headers=admin_headers)

    checkin = await client.post("/api/v1/visits/check-in", json={
        "visitor_name": "Hook Visitor", "visitor_type": "walk_in", "tenant_id": tenant_id,
    }, headers=staff_headers)
    visit_id = checkin.json()["id"]

    resp = await client.post("/webhooks/whatsapp", json={
        "entry": [{
            "changes": [{
                "value": {
                    "messages": [{
                        "from": "+526641112200",
                        "type": "button_reply",
                        "button": {"payload": f"approve|{visit_id}"},
                    }],
                },
            }],
        }],
    })
    assert resp.status_code == 200

    get_visit = await client.get(f"/api/v1/visits/history?status=approved", headers=staff_headers)
    visit_ids = [v["id"] for v in get_visit.json()]
    assert visit_id in visit_ids


@pytest.mark.asyncio
async def test_inbound_webhook_button_reply_deny(client, staff_headers, test_tenant_id, admin_headers):
    checkin = await client.post("/api/v1/visits/check-in", json={
        "visitor_name": "Deny Test", "visitor_type": "walk_in", "tenant_id": test_tenant_id,
    }, headers=staff_headers)
    visit_id = checkin.json()["id"]

    resp = await client.post("/webhooks/whatsapp", json={
        "entry": [{
            "changes": [{
                "value": {
                    "messages": [{
                        "from": "+526649999999",
                        "type": "button_reply",
                        "button": {"payload": f"deny|{visit_id}"},
                    }],
                },
            }],
        }],
    })
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_inbound_text_message(client):
    resp = await client.post("/webhooks/whatsapp", json={
        "entry": [{
            "changes": [{
                "value": {
                    "messages": [{
                        "from": "+526641112200",
                        "type": "text",
                        "text": {"body": "Hola"},
                    }],
                },
            }],
        }],
    })
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_invalid_payload_does_not_crash(client):
    resp = await client.post("/webhooks/whatsapp", json={
        "entry": [{
            "changes": [{
                "value": {
                    "messages": [{
                        "from": "+526641112200",
                        "type": "button_reply",
                        "button": {"payload": "approve|not-a-uuid"},
                    }],
                },
            }],
        }],
    })
    assert resp.status_code == 200
