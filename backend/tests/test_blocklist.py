import pytest


@pytest.mark.asyncio
async def test_list_blocklist(client, staff_headers):
    resp = await client.get("/api/v1/blocklist", headers=staff_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_add_blocklist_entry(client, admin_headers):
    resp = await client.post("/api/v1/blocklist", json={
        "name": "John Doe",
        "phone": "+526641112233",
        "reason": "Suspicious activity",
    }, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "John Doe"
    assert "id" in data


@pytest.mark.asyncio
async def test_add_blocklist_staff_forbidden(client, staff_headers):
    resp = await client.post("/api/v1/blocklist", json={
        "name": "Bad Actor",
    }, headers=staff_headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_check_blocklist_matched(client, admin_headers, staff_headers):
    await client.post("/api/v1/blocklist", json={
        "name": "Jane Roe",
        "phone": "+526649999888",
    }, headers=admin_headers)

    resp = await client.post("/api/v1/blocklist/check", json={
        "name": "Jane Roe",
    }, headers=staff_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["matched"] is True


@pytest.mark.asyncio
async def test_check_blocklist_no_match(client, staff_headers):
    resp = await client.post("/api/v1/blocklist/check", json={
        "name": "Unknown Person",
    }, headers=staff_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["matched"] is False


@pytest.mark.asyncio
async def test_delete_blocklist_entry(client, admin_headers):
    create = await client.post("/api/v1/blocklist", json={
        "name": "Delete Me",
    }, headers=admin_headers)
    entry_id = create.json()["id"]

    resp = await client.delete(f"/api/v1/blocklist/{entry_id}", headers=admin_headers)
    assert resp.status_code == 200

    resp = await client.get("/api/v1/blocklist", headers=admin_headers)
    ids = [e["id"] for e in resp.json()]
    assert entry_id not in ids
