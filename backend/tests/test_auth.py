import pytest


@pytest.mark.asyncio
async def test_login_success(client, staff_token):
    assert isinstance(staff_token, str)
    assert len(staff_token) > 20


@pytest.mark.asyncio
async def test_login_invalid_credentials(client):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "noone@test.com", "password": "wrong",
    })
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid credentials"


@pytest.mark.asyncio
async def test_login_missing_fields(client):
    resp = await client.post("/api/v1/auth/login", json={"email": "test@test.com"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_refresh_token(client, admin_token):
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": ""})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client, staff_headers):
    resp = await client.get("/api/v1/auth/me", headers=staff_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    assert data["role"] == "lobby_staff"


@pytest.mark.asyncio
async def test_me_unauthenticated(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_rbac_security_cannot_admin(client, security_headers):
    resp = await client.get("/api/v1/admin/users", headers=security_headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_rbac_staff_can_read_visitors(client, staff_headers):
    resp = await client.get("/api/v1/visitors", headers=staff_headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_rbac_security_can_read_visitors(client, security_headers):
    resp = await client.get("/api/v1/visitors", headers=security_headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_rbac_security_cannot_create_visitor(client, security_headers):
    resp = await client.post("/api/v1/visitors", json={
        "name": "Unauthorized",
    }, headers=security_headers)
    assert resp.status_code == 403
