import pytest


@pytest.mark.asyncio
async def test_create_delivery(client, staff_headers):
    resp = await client.post("/api/v1/deliveries", json={
        "courier": "DHL",
        "recipient_name": "Ana Torres",
        "recipient_phone": "+526641112233",
        "description": "Documentos",
    }, headers=staff_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["courier"] == "DHL"
    assert data["recipient_name"] == "Ana Torres"
    assert data["status"] == "pending"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_delivery_missing_required(client, staff_headers):
    resp = await client.post("/api/v1/deliveries", json={
        "courier": "FedEx",
    }, headers=staff_headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_active_deliveries(client, staff_headers):
    resp = await client.get("/api/v1/deliveries", headers=staff_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_collect_delivery(client, staff_headers):
    create = await client.post("/api/v1/deliveries", json={
        "courier": "UPS",
        "recipient_name": "Pedro Infante",
    }, headers=staff_headers)
    delivery_id = create.json()["id"]

    resp = await client.post(f"/api/v1/deliveries/{delivery_id}/collect", headers=staff_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "collected"


@pytest.mark.asyncio
async def test_collect_delivery_not_found(client, staff_headers):
    resp = await client.post(
        "/api/v1/deliveries/00000000-0000-0000-0000-000000000000/collect",
        headers=staff_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_notify_delivery_no_phone(client, staff_headers):
    create = await client.post("/api/v1/deliveries", json={
        "courier": "Correos",
        "recipient_name": "Sin Teléfono",
    }, headers=staff_headers)
    delivery_id = create.json()["id"]

    resp = await client.post(f"/api/v1/deliveries/{delivery_id}/notify", headers=staff_headers)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_notify_delivery_not_found(client, staff_headers):
    resp = await client.post(
        "/api/v1/deliveries/00000000-0000-0000-0000-000000000000/notify",
        headers=staff_headers,
    )
    assert resp.status_code == 404
