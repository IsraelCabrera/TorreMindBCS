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
async def test_reports_unauthorized(client):
    resp = await client.get("/api/v1/reports/daily")
    assert resp.status_code == 401
