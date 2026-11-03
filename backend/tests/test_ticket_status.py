"""
Status machine tests: valid and invalid transitions.
"""
import pytest
from httpx import AsyncClient

from tests.conftest import _register, _login, _create_user, _create_ticket


@pytest.fixture(scope="module")
async def setup(client):
    tokens_admin = await _register(client, "StatusBiz", "status-admin@biz.com")
    admin_token = tokens_admin["access_token"]

    agent_data = await _create_user(client, admin_token, "status-agent@biz.com", "agent")
    await _create_user(client, admin_token, "status-cust@biz.com", "customer")

    tokens_agent = await _login(client, "status-agent@biz.com")
    tokens_cust = await _login(client, "status-cust@biz.com")

    ticket = await _create_ticket(client, tokens_cust["access_token"], "Status test ticket")

    # Admin assigns ticket to agent
    await client.patch(
        f"/tickets/{ticket['id']}",
        json={"agent_id": agent_data["id"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # get admin user id via /auth/me
    r_admin = await client.get("/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    admin_user_id = r_admin.json()["id"]

    return {
        "admin_token": admin_token,
        "agent_token": tokens_agent["access_token"],
        "cust_token": tokens_cust["access_token"],
        "ticket_id": ticket["id"],
        "agent_user_id": agent_data["id"],
        "admin_user_id": admin_user_id,
    }


@pytest.mark.asyncio
async def test_customer_cannot_start_progress(client: AsyncClient, setup):
    # ticket is back to open after reopen; customer must not be able to move to in_progress
    r = await client.patch(
        f"/tickets/{setup['ticket_id']}",
        json={"status": "in_progress"},
        headers={"Authorization": f"Bearer {setup['cust_token']}"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_open_to_in_progress(client: AsyncClient, setup):
    r = await client.patch(
        f"/tickets/{setup['ticket_id']}",
        json={"status": "in_progress"},
        headers={"Authorization": f"Bearer {setup['agent_token']}"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"


@pytest.mark.asyncio
async def test_cannot_skip_to_closed(client: AsyncClient, setup):
    # ticket is now in_progress, try jumping to closed (invalid)
    r = await client.patch(
        f"/tickets/{setup['ticket_id']}",
        json={"status": "closed"},
        headers={"Authorization": f"Bearer {setup['agent_token']}"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_customer_cannot_mark_resolved(client: AsyncClient, setup):
    # ticket is in_progress, customer tries to mark resolved -> 403
    r = await client.patch(
        f"/tickets/{setup['ticket_id']}",
        json={"status": "resolved"},
        headers={"Authorization": f"Bearer {setup['cust_token']}"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_in_progress_to_resolved(client: AsyncClient, setup):
    r = await client.patch(
        f"/tickets/{setup['ticket_id']}",
        json={"status": "resolved"},
        headers={"Authorization": f"Bearer {setup['agent_token']}"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "resolved"


@pytest.mark.asyncio
async def test_agent_cannot_reopen(client: AsyncClient, setup):
    # Only customer can reopen resolved -> open
    r = await client.patch(
        f"/tickets/{setup['ticket_id']}",
        json={"status": "open"},
        headers={"Authorization": f"Bearer {setup['agent_token']}"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_customer_can_reopen(client: AsyncClient, setup):
    r = await client.patch(
        f"/tickets/{setup['ticket_id']}",
        json={"status": "open"},
        headers={"Authorization": f"Bearer {setup['cust_token']}"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "open"


@pytest.mark.asyncio
async def test_agent_self_assign(client: AsyncClient, setup):
    r = await client.patch(
        f"/tickets/{setup['ticket_id']}",
        json={"agent_id": setup["agent_user_id"]},
        headers={"Authorization": f"Bearer {setup['agent_token']}"},
    )
    assert r.status_code == 200
    assert r.json()["agent_id"] == setup["agent_user_id"]


@pytest.mark.asyncio
async def test_agent_cannot_assign_other(client: AsyncClient, setup):
    # agent tries to assign to admin (not an agent role) or another user
    r = await client.patch(
        f"/tickets/{setup['ticket_id']}",
        json={"agent_id": setup["admin_user_id"]},
        headers={"Authorization": f"Bearer {setup['agent_token']}"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_admin_assign_to_agent(client: AsyncClient, setup):
    r = await client.patch(
        f"/tickets/{setup['ticket_id']}",
        json={"agent_id": setup["agent_user_id"]},
        headers={"Authorization": f"Bearer {setup['admin_token']}"},
    )
    assert r.status_code == 200
    assert r.json()["agent_id"] == setup["agent_user_id"]


@pytest.mark.asyncio
async def test_ticket_has_category_and_priority(client: AsyncClient, setup):
    r = await client.post(
        "/tickets",
        json={"subject": "Cat/Pri test", "category": "billing", "priority": "high", "first_message": "Hi"},
        headers={"Authorization": f"Bearer {setup['cust_token']}"},
    )
    assert r.status_code == 201
    data = r.json()
    assert data["category"] == "billing"
    assert data["priority"] == "high"
