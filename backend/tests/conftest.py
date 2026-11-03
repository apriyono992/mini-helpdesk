"""
Shared fixtures: two separate businesses, each with 1 admin + 1 customer.
Uses ASGI transport directly — no running server needed.
Cleans up only test-specific businesses so dev seed data is never destroyed.
"""
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import delete, select

from app.main import app
from app.db.session import AsyncSessionLocal
from app.models import Business, User, Ticket, Message, Category  # noqa: F401 register metadata

TEST_BIZ_NAMES = [
    "TestBiz",
    "TestBizA",
    "TestBizB",
    "BizA",
    "BizB",
    "StatusBiz",
    "CatBizA",
    "CatBizB",
    "AuthTestBiz",
    "LoginBiz",
    "MeBiz",
    "RefreshBiz",
    "BadRefreshBiz",
    "BizA-iso",
    "BizB-iso",
    "BizC-iso",
    "BizD-iso",
    "WSBizA",
    "WSBizB",
    "BizAgent-iso",
    "RateLimitBiz",
    "BizSearchA",
    "BizSearchB",
    "TypingBiz",
    "AttachBizA",
    "AttachBizB",
    "WSNotifA",
    "WSNotifB",
    "ReceiptBiz",
    "BizFilterAssign",
]

# Businesses that must NEVER be touched by test cleanup
PROTECTED_BIZ_NAMES = ["Acme Corp", "Globex Inc"]


async def _clean_test_data():
    async with AsyncSessionLocal() as session:
        biz_res = await session.execute(
            select(Business.id).where(
                Business.name.in_(TEST_BIZ_NAMES),
                Business.name.not_in(PROTECTED_BIZ_NAMES),
            )
        )
        biz_ids = list(biz_res.scalars().all())
        if biz_ids:
            t_res = await session.execute(
                select(Ticket.id).where(Ticket.business_id.in_(biz_ids))
            )
            ticket_ids = list(t_res.scalars().all())
            if ticket_ids:
                await session.execute(delete(Message).where(Message.ticket_id.in_(ticket_ids)))
            await session.execute(delete(Ticket).where(Ticket.business_id.in_(biz_ids)))
            await session.execute(delete(Category).where(Category.business_id.in_(biz_ids)))
            await session.execute(delete(User).where(User.business_id.in_(biz_ids)))
            await session.execute(delete(Business).where(Business.id.in_(biz_ids)))
            await session.commit()


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def clean_db():
    """Clean test businesses before and after test session so dev data is preserved."""
    await _clean_test_data()
    yield
    await _clean_test_data()


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


async def _login(client: AsyncClient, email: str, password: str = "pass1234", device_id: str | None = None):
    dev = device_id or f"test-device-{email}"
    r = await client.post(
        "/auth/login",
        json={"email": email, "password": password},
        headers={"X-Device-Id": dev},
    )
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
