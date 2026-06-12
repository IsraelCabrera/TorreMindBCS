import pytest


@pytest.mark.asyncio
async def test_list_users(client, admin_headers):
    resp = await client.get("/api/v1/admin/users", headers=admin_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_list_users_forbidden_staff(client, staff_headers):
    resp = await client.get("/api/v1/admin/users", headers=staff_headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_user(client, admin_headers):
    resp = await client.post("/api/v1/admin/users", json={
        "email": "newuser@test.com",
        "password": "test123",
        "name": "New User",
        "role": "lobby_staff",
    }, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "newuser@test.com"
    assert data["role"] == "lobby_staff"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_duplicate_email(client, admin_headers):
    await client.post("/api/v1/admin/users", json={
        "email": "dupe@test.com", "password": "test123", "name": "Original",
    }, headers=admin_headers)
    resp = await client.post("/api/v1/admin/users", json={
        "email": "dupe@test.com", "password": "test123", "name": "Duplicate",
    }, headers=admin_headers)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_update_user(client, admin_headers):
    create = await client.post("/api/v1/admin/users", json={
        "email": "updatable@test.com", "password": "test123", "name": "Original Name",
    }, headers=admin_headers)
    user_id = create.json()["id"]

    resp = await client.put(f"/api/v1/admin/users/{user_id}", json={
        "name": "Updated Name",
    }, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "updated"


@pytest.mark.asyncio
async def test_update_user_password(client, admin_headers):
    create = await client.post("/api/v1/admin/users", json={
        "email": "pwchange@test.com", "password": "oldpass", "name": "PW User",
    }, headers=admin_headers)
    user_id = create.json()["id"]

    resp = await client.put(f"/api/v1/admin/users/{user_id}", json={
        "password": "newpass",
    }, headers=admin_headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_deactivate_user(client, admin_headers):
    create = await client.post("/api/v1/admin/users", json={
        "email": "deactivate@test.com", "password": "test123", "name": "Deactivate Me",
    }, headers=admin_headers)
    user_id = create.json()["id"]

    resp = await client.delete(f"/api/v1/admin/users/{user_id}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "deactivated"


@pytest.mark.asyncio
async def test_deactivate_user_forbidden_staff(client, staff_headers):
    resp = await client.delete("/api/v1/admin/users/00000000-0000-0000-0000-000000000000", headers=staff_headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_deactivate_user_not_found(client, admin_headers):
    resp = await client.delete("/api/v1/admin/users/00000000-0000-0000-0000-000000000000", headers=admin_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_audit_logs(client, admin_headers):
    resp = await client.get("/api/v1/admin/audit-log", headers=admin_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_list_audit_logs_forbidden_staff(client, staff_headers):
    resp = await client.get("/api/v1/admin/audit-log", headers=staff_headers)
    assert resp.status_code == 403
