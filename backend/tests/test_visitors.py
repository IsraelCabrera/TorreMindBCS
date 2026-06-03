import pytest


@pytest.mark.asyncio
async def test_create_visitor(client, staff_headers):
    resp = await client.post("/api/v1/visitors", json={
        "name": "María García",
        "phone": "+526641112233",
        "company": "Widgets SA",
    }, headers=staff_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "María García"
    assert data["phone"] == "+526641112233"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_visitor_no_name(client, staff_headers):
    resp = await client.post("/api/v1/visitors", json={"phone": "+526649999999"}, headers=staff_headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_visitors(client, staff_headers):
    resp = await client.get("/api/v1/visitors", headers=staff_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_search_visitors_by_name(client, staff_headers):
    await client.post("/api/v1/visitors", json={"name": "Searchable Person"}, headers=staff_headers)
    resp = await client.get("/api/v1/visitors?q=Searchable", headers=staff_headers)
    assert resp.status_code == 200
    names = [v["name"] for v in resp.json()]
    assert "Searchable Person" in names


@pytest.mark.asyncio
async def test_get_visitor(client, staff_headers, test_visitor_id):
    resp = await client.get(f"/api/v1/visitors/{test_visitor_id}", headers=staff_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == test_visitor_id


@pytest.mark.asyncio
async def test_get_visitor_not_found(client, staff_headers):
    resp = await client.get("/api/v1/visitors/00000000-0000-0000-0000-000000000000", headers=staff_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_visitor(client, staff_headers, test_visitor_id):
    resp = await client.put(f"/api/v1/visitors/{test_visitor_id}", json={
        "name": "Juan Pérez Updated",
        "phone": "+526649876543",
        "company": "Acme Updated",
    }, headers=staff_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Juan Pérez Updated"


@pytest.mark.asyncio
async def test_unauthorized_access(client):
    resp = await client.get("/api/v1/visitors")
    assert resp.status_code == 401
