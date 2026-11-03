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

    await _create_user(client, admin_token, "status-agent@biz.com", "agent")
    await _create_user(client, admin_token, "status-cust@biz.com", "customer")

    tokens_agent = await _login(client, "status-agent@biz.com")
    tokens_cust = await _login(client, "status-cust@biz.com")

    ticket = await _create_ticket(client, tokens_cust["access_token"], "Status test ticket")
    return {
        "admin_token": admin_token,
        "agent_token": tokens_agent["access_token"],
        "cust_token": tokens_cust["access_token"],
        "ticket_id": ticket["id"],
    }


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
