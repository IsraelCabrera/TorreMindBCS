import pytest


@pytest.mark.asyncio
async def test_create_delivery(client, staff_headers):
    resp = await client.post("/api/v1/deliveries", json={
        "courier": "DHL",
        "recipient_name": "Ana Torres",
        "guide_number": "1Z999AA10123456784",
        "description": "Documentos",
    }, headers=staff_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["courier"] == "DHL"
    assert data["recipient_name"] == "Ana Torres"
    assert data["guide_number"] == "1Z999AA10123456784"
    assert data["status"] == "pending"
    assert data["collected_by"] is None
    assert "id" in data


@pytest.mark.asyncio
async def test_create_delivery_with_guide_number(client, staff_headers):
    resp = await client.post("/api/v1/deliveries", json={
        "courier": "FedEx",
        "recipient_name": "Juan Perez",
        "guide_number": "1234567890",
    }, headers=staff_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["guide_number"] == "1234567890"


@pytest.mark.asyncio
async def test_create_delivery_missing_required(client, staff_headers):
    resp = await client.post("/api/v1/deliveries", json={
        "courier": "FedEx",
    }, headers=staff_headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_deliveries_status_filter(client, staff_headers):
    # Create pending delivery
    create1 = await client.post("/api/v1/deliveries", json={
        "courier": "DHL", "recipient_name": "Ana Torres", "guide_number": "G1"
    }, headers=staff_headers)
    assert create1.status_code == 200

    # Create another and collect it
    create2 = await client.post("/api/v1/deliveries", json={
        "courier": "UPS", "recipient_name": "Pedro Infante", "guide_number": "G2"
    }, headers=staff_headers)
    delivery_id = create2.json()["id"]
    await client.post(f"/api/v1/deliveries/{delivery_id}/collect",
                     json={"collected_by": "owner"}, headers=staff_headers)

    # Test pending filter
    resp = await client.get("/api/v1/deliveries?status=pending", headers=staff_headers)
    assert resp.status_code == 200
    pending = resp.json()
    assert all(d["status"] == "pending" for d in pending)

    # Test collected filter
    resp = await client.get("/api/v1/deliveries?status=collected", headers=staff_headers)
    assert resp.status_code == 200
    collected = resp.json()
    assert all(d["status"] == "collected" for d in collected)
    assert len(collected) >= 1

    # Test all filter
    resp = await client.get("/api/v1/deliveries?status=all", headers=staff_headers)
    assert resp.status_code == 200
    all_deliveries = resp.json()
    assert len(all_deliveries) >= 2


@pytest.mark.asyncio
async def test_collect_delivery(client, staff_headers):
    create = await client.post("/api/v1/deliveries", json={
        "courier": "UPS",
        "recipient_name": "Pedro Infante",
    }, headers=staff_headers)
    delivery_id = create.json()["id"]

    resp = await client.post(f"/api/v1/deliveries/{delivery_id}/collect",
                            json={"collected_by": "owner"}, headers=staff_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "collected"

    # Verify collected_by in list
    resp = await client.get(f"/api/v1/deliveries?status=all", headers=staff_headers)
    delivery = next(d for d in resp.json() if d["id"] == delivery_id)
    assert delivery["collected_by"] == "owner"
    assert delivery["status"] == "collected"


@pytest.mark.asyncio
async def test_collect_delivery_by_other(client, staff_headers):
    create = await client.post("/api/v1/deliveries", json={
        "courier": "FedEx",
        "recipient_name": "Maria Lopez",
    }, headers=staff_headers)
    delivery_id = create.json()["id"]

    resp = await client.post(f"/api/v1/deliveries/{delivery_id}/collect",
                            json={"collected_by": "other", "collected_by_name": "Carlos Ruiz"}, headers=staff_headers)
    assert resp.status_code == 200

    resp = await client.get(f"/api/v1/deliveries?status=all", headers=staff_headers)
    delivery = next(d for d in resp.json() if d["id"] == delivery_id)
    assert delivery["collected_by"] == "other"
    assert delivery["collected_by_name"] == "Carlos Ruiz"


@pytest.mark.asyncio
async def test_collect_delivery_by_other_requires_name(client, staff_headers):
    create = await client.post("/api/v1/deliveries", json={
        "courier": "DHL", "recipient_name": "Test",
    }, headers=staff_headers)
    delivery_id = create.json()["id"]

    # Should fail without collected_by_name
    resp = await client.post(f"/api/v1/deliveries/{delivery_id}/collect",
                            json={"collected_by": "other"}, headers=staff_headers)
    assert resp.status_code == 422

    # Should fail with empty collected_by_name
    resp = await client.post(f"/api/v1/deliveries/{delivery_id}/collect",
                            json={"collected_by": "other", "collected_by_name": "  "}, headers=staff_headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_collect_delivery_not_found(client, staff_headers):
    resp = await client.post(
        "/api/v1/deliveries/00000000-0000-0000-0000-000000000000/collect",
        json={"collected_by": "owner"},
        headers=staff_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_collect_delivery_invalid_collected_by(client, staff_headers):
    create = await client.post("/api/v1/deliveries", json={
        "courier": "DHL", "recipient_name": "Test",
    }, headers=staff_headers)
    delivery_id = create.json()["id"]

    resp = await client.post(f"/api/v1/deliveries/{delivery_id}/collect",
                            json={"collected_by": "invalid"}, headers=staff_headers)
    assert resp.status_code == 422


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