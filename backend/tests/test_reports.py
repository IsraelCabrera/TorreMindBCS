import pytest


@pytest.mark.asyncio
async def test_daily_report(client, staff_headers, test_tenant_id):
    await client.post("/api/v1/visits/check-in", json={
        "visitor_name": "Report Visitor",
        "visitor_type": "walk_in",
        "tenant_id": test_tenant_id,
    }, headers=staff_headers)

    resp = await client.get("/api/v1/reports/daily", headers=staff_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "date" in data
    assert "total" in data
    assert "breakdown" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_metrics_report(client, staff_headers):
    resp = await client.get("/api/v1/reports/metrics", headers=staff_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), dict)


@pytest.mark.asyncio
async def test_delivery_report(client, staff_headers):
    # Create deliveries
    await client.post("/api/v1/deliveries", json={
        "courier": "DHL", "recipient_name": "Ana Torres", "guide_number": "G1"
    }, headers=staff_headers)

    create2 = await client.post("/api/v1/deliveries", json={
        "courier": "UPS", "recipient_name": "Pedro Infante", "guide_number": "G2"
    }, headers=staff_headers)
    delivery_id = create2.json()["id"]
    await client.post(f"/api/v1/deliveries/{delivery_id}/collect",
                     json={"collected_by": "owner"}, headers=staff_headers)

    create3 = await client.post("/api/v1/deliveries", json={
        "courier": "FedEx", "recipient_name": "Maria Lopez", "guide_number": "G3"
    }, headers=staff_headers)
    delivery_id3 = create3.json()["id"]
    await client.post(f"/api/v1/deliveries/{delivery_id3}/collect",
                     json={"collected_by": "other", "collected_by_name": "Carlos Ruiz"}, headers=staff_headers)

    resp = await client.get("/api/v1/reports/deliveries", headers=staff_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_received"] >= 3
    assert data["total_collected"] == 2
    assert data["pending"] >= 1
    assert data["collected_by_owner"] == 1
    assert data["collected_by_other"] == 1
    assert len(data["daily"]) >= 1


@pytest.mark.asyncio
async def test_delivery_report_date_filter(client, staff_headers):
    resp = await client.get("/api/v1/reports/deliveries?from_date=2030-01-01", headers=staff_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_received"] == 0


@pytest.mark.asyncio
async def test_reports_unauthorized(client):
    resp = await client.get("/api/v1/reports/daily")
    assert resp.status_code == 401
