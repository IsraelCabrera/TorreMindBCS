import pytest


@pytest.mark.asyncio
async def test_active_visits_security(client, security_headers):
    resp = await client.get("/api/v1/visits/active", headers=security_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_visit_history_security(client, security_headers):
    resp = await client.get("/api/v1/visits/history", headers=security_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_check_in_forbidden_security(client, security_headers):
    resp = await client.post("/api/v1/visits/check-in", json={
        "visitor_name": "Security Test",
    }, headers=security_headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_check_out_forbidden_security(client, security_headers):
    resp = await client.post(
        "/api/v1/visits/00000000-0000-0000-0000-000000000000/check-out",
        headers=security_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_check_in_new_visitor(client, staff_headers, test_tenant_id):
    resp = await client.post("/api/v1/visits/check-in", json={
        "visitor_name": "Carlos López",
        "visitor_phone": "+526647778899",
        "visitor_company": "Tech SA",
        "visitor_type": "vendor",
        "tenant_id": test_tenant_id,
        "host_name": "Ana",
        "purpose": "Instalación",
    }, headers=staff_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["visitor_name"] == "Carlos López"
    assert data["status"] == "pending"
    assert data["visitor_type"] == "vendor"
    assert "id" in data


@pytest.mark.asyncio
async def test_check_in_returning_visitor(client, staff_headers, test_tenant_id, test_visitor_id):
    resp = await client.post("/api/v1/visits/check-in", json={
        "visitor_id": test_visitor_id,
        "visitor_type": "walk_in",
        "tenant_id": test_tenant_id,
        "purpose": "Reunión",
    }, headers=staff_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["visitor_name"] == "Juan Pérez"
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_check_in_no_name(client, staff_headers):
    resp = await client.post("/api/v1/visits/check-in", json={
        "visitor_type": "walk_in",
    }, headers=staff_headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_active_visits(client, staff_headers):
    resp = await client.get("/api/v1/visits/active", headers=staff_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_check_out(client, staff_headers, test_tenant_id):
    checkin = await client.post("/api/v1/visits/check-in", json={
        "visitor_name": "Checkout Test",
        "visitor_type": "walk_in",
        "tenant_id": test_tenant_id,
    }, headers=staff_headers)
    visit_id = checkin.json()["id"]

    resp = await client.post(f"/api/v1/visits/{visit_id}/check-out", headers=staff_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "checked_out"


@pytest.mark.asyncio
async def test_check_out_not_found(client, staff_headers):
    resp = await client.post(
        "/api/v1/visits/00000000-0000-0000-0000-000000000000/check-out",
        headers=staff_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_visit_history(client, staff_headers, test_tenant_id):
    await client.post("/api/v1/visits/check-in", json={
        "visitor_name": "History Test",
        "visitor_type": "walk_in",
        "tenant_id": test_tenant_id,
    }, headers=staff_headers)

    resp = await client.get("/api/v1/visits/history", headers=staff_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_visit_history_filter(client, staff_headers):
    resp = await client.get("/api/v1/visits/history?visitor_name=History&status=pending", headers=staff_headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_escalate_visit(client, staff_headers, test_tenant_id):
    checkin = await client.post("/api/v1/visits/check-in", json={
        "visitor_name": "Escalate Test",
        "visitor_type": "walk_in",
        "tenant_id": test_tenant_id,
    }, headers=staff_headers)
    visit_id = checkin.json()["id"]

    resp = await client.post(f"/api/v1/visits/{visit_id}/escalate", headers=staff_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "escalated"


@pytest.mark.asyncio
async def test_notify_retry(client, staff_headers, test_tenant_id):
    checkin = await client.post("/api/v1/visits/check-in", json={
        "visitor_name": "Retry Notification",
        "visitor_type": "walk_in",
        "tenant_id": test_tenant_id,
    }, headers=staff_headers)
    visit_id = checkin.json()["id"]

    resp = await client.post(f"/api/v1/visits/{visit_id}/notify-retry", headers=staff_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "notification_resent"


@pytest.mark.asyncio
async def test_update_visit(client, staff_headers, test_tenant_id):
    checkin = await client.post("/api/v1/visits/check-in", json={
        "visitor_name": "Update Visit",
        "visitor_type": "walk_in",
        "tenant_id": test_tenant_id,
    }, headers=staff_headers)
    visit_id = checkin.json()["id"]

    resp = await client.put(f"/api/v1/visits/{visit_id}", json={
        "status": "approved", "purpose": "Updated purpose",
    }, headers=staff_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "updated"
