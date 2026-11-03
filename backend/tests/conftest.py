"""
Shared fixtures: dua business terpisah, masing-masing 1 admin + 1 customer.
Semua fixture pakai AsyncClient langsung ke app (tidak butuh server running).
"""
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.session import AsyncSessionLocal, engine
from app.db.base import Base
from app.models import Business, User, Ticket, Message  # register metadata


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# ---------- helpers ----------

async def _register(client: AsyncClient, business: str, email: str, password: str = "pass1234"):
    r = await client.post("/auth/registerbusiness", json={
        "business_name": business,
        "full_name": "Test User",
        "email": email,
        "password": password,
    })
    assert r.status_code == 201, r.text
    return r.json()


async def _login(client: AsyncClient, email: str, password: str = "pass1234"):
    r = await client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()


async def _create_user(client: AsyncClient, token: str, email: str, role: str, password: str = "pass1234"):
    r = await client.post("/users", json={
        "email": email,
        "full_name": role.capitalize(),
        "password": password,
        "role": role,
    }, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201, r.text
    return r.json()


async def _create_ticket(client: AsyncClient, token: str, subject: str = "Test subject"):
    r = await client.post("/tickets", json={
        "subject": subject,
        "first_message": "Hello",
    }, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201, r.text
    return r.json()
