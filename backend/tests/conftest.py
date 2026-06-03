from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.config import settings
from app.core.auth import hash_password
from app.database import get_db
from app.main import app
from app.models.base import Base
from app.models.user import User

engine = create_async_engine(settings.database_url)


@pytest_asyncio.fixture(scope="session")
async def prepare_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with engine.begin() as conn:
        await conn.execute(
            User.__table__.insert(), [
                {"email": "admin@test.com", "password_hash": hash_password("admin123"), "name": "Admin Test", "role": "admin", "is_active": True},
                {"email": "staff@test.com", "password_hash": hash_password("staff123"), "name": "Staff Test", "role": "lobby_staff", "is_active": True},
                {"email": "security@test.com", "password_hash": hash_password("security123"), "name": "Security Test", "role": "security", "is_active": True},
            ]
        )
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(prepare_db) -> AsyncGenerator[AsyncSession, None]:
    conn = await engine.connect()
    trans = await conn.begin()
    session = AsyncSession(bind=conn, expire_on_commit=False)
    yield session
    await session.close()
    await trans.rollback()
    await conn.close()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def admin_token(client: AsyncClient) -> str:
    resp = await client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "admin123"})
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def staff_token(client: AsyncClient) -> str:
    resp = await client.post("/api/v1/auth/login", json={"email": "staff@test.com", "password": "staff123"})
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def security_token(client: AsyncClient) -> str:
    resp = await client.post("/api/v1/auth/login", json={"email": "security@test.com", "password": "security123"})
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def admin_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest_asyncio.fixture
async def staff_headers(staff_token: str) -> dict:
    return {"Authorization": f"Bearer {staff_token}"}


@pytest_asyncio.fixture
async def security_headers(security_token: str) -> dict:
    return {"Authorization": f"Bearer {security_token}"}


@pytest_asyncio.fixture
async def test_tenant_id(client: AsyncClient, admin_headers: dict) -> str:
    resp = await client.post("/api/v1/tenants", json={
        "name": "Test Corp",
        "unit": "A-101",
        "floor": 1,
        "primary_phone": "+526641234567",
        "primary_email": "test@corp.com",
    }, headers=admin_headers)
    return resp.json()["id"]


@pytest_asyncio.fixture
async def test_visitor_id(client: AsyncClient, staff_headers: dict) -> str:
    resp = await client.post("/api/v1/visitors", json={
        "name": "Juan Pérez",
        "phone": "+526649876543",
        "company": "Acme",
    }, headers=staff_headers)
    return resp.json()["id"]
