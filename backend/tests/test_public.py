import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_public_tenants_no_auth(client: AsyncClient, test_tenant_id: str):
    res = await client.get("/api/v1/public/tenants")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if data:
        assert "id" in data[0]
        assert "name" in data[0]
        assert "unit" in data[0]
        assert "contacts" not in data[0]


@pytest.mark.asyncio
async def test_self_register_success(client: AsyncClient, test_tenant_id: str):
    res = await client.post("/api/v1/public/self-register", json={
        "name": "Luis Test",
        "phone": "+526649999888",
        "company": "Test Corp",
        "host_name": "Alejandra García",
        "tenant_id": test_tenant_id,
        "purpose": "Reunión de prueba",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["visitor_name"] == "Luis Test"
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_self_register_honeypot_rejected(client: AsyncClient):
    res = await client.post("/api/v1/public/self-register", json={
        "name": "Bot User",
        "fax_number": "555-1234",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["visit_id"] is None


@pytest.mark.asyncio
async def test_self_register_no_name(client: AsyncClient):
    res = await client.post("/api/v1/public/self-register", json={
        "name": "",
    })
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_self_register_existing_visitor(client: AsyncClient, test_visitor_id: str, test_tenant_id: str):
    res = await client.post("/api/v1/public/self-register", json={
        "name": "Juan Pérez",
        "phone": "+526649876543",
        "tenant_id": test_tenant_id,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["visitor_id"] == test_visitor_id
