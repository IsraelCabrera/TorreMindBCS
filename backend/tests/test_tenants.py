import pytest


@pytest.mark.asyncio
async def test_create_tenant(client, admin_headers):
    resp = await client.post("/api/v1/tenants", json={
        "name": "New Tenant",
        "unit": "B-202",
        "floor": 2,
        "primary_phone": "+526641234568",
    }, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "New Tenant"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_tenant_staff_forbidden(client, staff_headers):
    resp = await client.post("/api/v1/tenants", json={
        "name": "Staff Tenant",
    }, headers=staff_headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_tenants(client, staff_headers):
    resp = await client.get("/api/v1/tenants", headers=staff_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_get_tenant(client, staff_headers, test_tenant_id):
    resp = await client.get(f"/api/v1/tenants/{test_tenant_id}", headers=staff_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == test_tenant_id


@pytest.mark.asyncio
async def test_get_tenant_not_found(client, staff_headers):
    resp = await client.get("/api/v1/tenants/00000000-0000-0000-0000-000000000000", headers=staff_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_tenant(client, admin_headers, test_tenant_id):
    resp = await client.put(f"/api/v1/tenants/{test_tenant_id}", json={
        "name": "Updated Corp",
        "primary_phone": "+526641234569",
    }, headers=admin_headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_contact(client, admin_headers, test_tenant_id):
    resp = await client.post(f"/api/v1/tenants/{test_tenant_id}/contacts", json={
        "name": "Contact One",
        "phone": "+526641112244",
        "is_primary": True,
        "escalation_order": 0,
    }, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Contact One"
    assert data["is_primary"] is True


@pytest.mark.asyncio
async def test_list_contacts(client, staff_headers, test_tenant_id):
    resp = await client.get(f"/api/v1/tenants/{test_tenant_id}/contacts", headers=staff_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_update_contact(client, admin_headers, test_tenant_id):
    create = await client.post(f"/api/v1/tenants/{test_tenant_id}/contacts", json={
        "name": "Update Me", "phone": "+526641112245",
    }, headers=admin_headers)
    contact_id = create.json()["id"]

    resp = await client.put(
        f"/api/v1/tenants/{test_tenant_id}/contacts/{contact_id}",
        json={"name": "Updated Name", "phone": "+526641112245"},
        headers=admin_headers,
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_delete_contact(client, admin_headers, test_tenant_id):
    create = await client.post(f"/api/v1/tenants/{test_tenant_id}/contacts", json={
        "name": "Delete Me", "phone": "+526641112246",
    }, headers=admin_headers)
    contact_id = create.json()["id"]

    resp = await client.delete(
        f"/api/v1/tenants/{test_tenant_id}/contacts/{contact_id}",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "deleted"


@pytest.mark.asyncio
async def test_delete_tenant(client, admin_headers, test_tenant_id):
    resp = await client.delete(f"/api/v1/tenants/{test_tenant_id}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "deleted"

    resp = await client.get(f"/api/v1/tenants/{test_tenant_id}", headers=admin_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_tenant_staff_forbidden(client, staff_headers, test_tenant_id):
    resp = await client.delete(f"/api/v1/tenants/{test_tenant_id}", headers=staff_headers)
    assert resp.status_code == 403
