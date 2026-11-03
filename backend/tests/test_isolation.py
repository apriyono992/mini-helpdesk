"""
Tenant isolation tests.
Business A must NOT see tickets from business B, and vice versa.
Customer 1 must NOT see tickets from Customer 2 within the same business.
"""
import pytest
from httpx import AsyncClient

from tests.conftest import _register, _login, _create_user, _create_ticket


@pytest.mark.asyncio
async def test_business_a_cannot_see_business_b_ticket(client: AsyncClient):
    # Setup business A
    tokens_a = await _register(client, "BizA-iso", "admin-a-iso@biz.com")
    admin_a_token = tokens_a["access_token"]

    cust_a = await _create_user(client, admin_a_token, "cust-a-iso@biz.com", "customer")
    tokens_cust_a = await _login(client, "cust-a-iso@biz.com")
    cust_a_token = tokens_cust_a["access_token"]

    # Setup business B
    tokens_b = await _register(client, "BizB-iso", "admin-b-iso@biz.com")
    admin_b_token = tokens_b["access_token"]

    cust_b = await _create_user(client, admin_b_token, "cust-b-iso@biz.com", "customer")
    tokens_cust_b = await _login(client, "cust-b-iso@biz.com")
    cust_b_token = tokens_cust_b["access_token"]

    # Customer B creates a ticket
    ticket_b = await _create_ticket(client, cust_b_token, "Ticket in Biz B")
    ticket_b_id = ticket_b["id"]

    # Customer A (different business) tries to access ticket from B -> 404
    r = await client.get(f"/tickets/{ticket_b_id}", headers={"Authorization": f"Bearer {cust_a_token}"})
    assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"

    # Admin A tries too -> 404
    r = await client.get(f"/tickets/{ticket_b_id}", headers={"Authorization": f"Bearer {admin_a_token}"})
    assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"


@pytest.mark.asyncio
async def test_customer_cannot_see_other_customer_ticket_same_business(client: AsyncClient):
    # Setup one business, two customers
    tokens_admin = await _register(client, "BizC-iso", "admin-c-iso@biz.com")
    admin_token = tokens_admin["access_token"]

    await _create_user(client, admin_token, "cust-c1-iso@biz.com", "customer")
    await _create_user(client, admin_token, "cust-c2-iso@biz.com", "customer")

    tokens_c1 = await _login(client, "cust-c1-iso@biz.com")
    tokens_c2 = await _login(client, "cust-c2-iso@biz.com")

    # Customer 1 creates ticket
    ticket = await _create_ticket(client, tokens_c1["access_token"], "Private ticket C1")
    ticket_id = ticket["id"]

    # Customer 2 tries to access -> 404
    r = await client.get(f"/tickets/{ticket_id}", headers={"Authorization": f"Bearer {tokens_c2['access_token']}"})
    assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"


@pytest.mark.asyncio
async def test_customer_cannot_see_other_customer_messages(client: AsyncClient):
    tokens_admin = await _register(client, "BizD-iso", "admin-d-iso@biz.com")
    admin_token = tokens_admin["access_token"]

    await _create_user(client, admin_token, "cust-d1-iso@biz.com", "customer")
    await _create_user(client, admin_token, "cust-d2-iso@biz.com", "customer")

    tokens_d1 = await _login(client, "cust-d1-iso@biz.com")
    tokens_d2 = await _login(client, "cust-d2-iso@biz.com")

    ticket = await _create_ticket(client, tokens_d1["access_token"], "Private D1")
    ticket_id = ticket["id"]

    r = await client.get(f"/tickets/{ticket_id}/messages", headers={"Authorization": f"Bearer {tokens_d2['access_token']}"})
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_agent_can_only_see_assigned_tickets(client: AsyncClient):
    # Setup business with admin, 2 agents, 1 customer
    tok_admin = await _register(client, "BizAgent-iso", "admin-agent-iso@biz.com")
    admin_token = tok_admin["access_token"]

    ag1_data = await _create_user(client, admin_token, "ag1-iso@biz.com", "agent")
    ag2_data = await _create_user(client, admin_token, "ag2-iso@biz.com", "agent")
    await _create_user(client, admin_token, "cust-ag-iso@biz.com", "customer")

    tok_ag1 = await _login(client, "ag1-iso@biz.com")
    tok_ag2 = await _login(client, "ag2-iso@biz.com")
    tok_cust = await _login(client, "cust-ag-iso@biz.com")

    ag1_token = tok_ag1["access_token"]
    ag2_token = tok_ag2["access_token"]
    cust_token = tok_cust["access_token"]

    # Customer creates ticket (unassigned)
    ticket = await _create_ticket(client, cust_token, "Unassigned ticket")
    t_id = ticket["id"]

    # Agent 1 cannot see unassigned ticket in list
    r = await client.get("/tickets", headers={"Authorization": f"Bearer {ag1_token}"})
    assert r.status_code == 200
    assert len(r.json()["items"]) == 0

    # Agent 1 cannot access unassigned ticket directly -> 404
    r = await client.get(f"/tickets/{t_id}", headers={"Authorization": f"Bearer {ag1_token}"})
    assert r.status_code == 404

    # Agent 1 cannot patch unassigned ticket -> 404
    r = await client.patch(
        f"/tickets/{t_id}",
        json={"agent_id": ag1_data["id"]},
        headers={"Authorization": f"Bearer {ag1_token}"},
    )
    assert r.status_code == 404

    # Admin assigns ticket to Agent 2
    r_assign = await client.patch(
        f"/tickets/{t_id}",
        json={"agent_id": ag2_data["id"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r_assign.status_code == 200

    # Agent 1 still cannot see ticket -> 404
    r = await client.get(f"/tickets/{t_id}", headers={"Authorization": f"Bearer {ag1_token}"})
    assert r.status_code == 404

    # Agent 2 can see ticket in list and detail
    r = await client.get("/tickets", headers={"Authorization": f"Bearer {ag2_token}"})
    assert r.status_code == 200
    assert len(r.json()["items"]) == 1
    assert r.json()["items"][0]["id"] == t_id

    r = await client.get(f"/tickets/{t_id}", headers={"Authorization": f"Bearer {ag2_token}"})
    assert r.status_code == 200
    assert r.json()["id"] == t_id
    assert r.json()["agent_id"] == ag2_data["id"]

    # Customer viewing ticket gets agent_id as None (privacy)
    r_cust = await client.get(f"/tickets/{t_id}", headers={"Authorization": f"Bearer {cust_token}"})
    assert r_cust.status_code == 200
    assert r_cust.json()["agent_id"] is None

    r_cust_list = await client.get("/tickets", headers={"Authorization": f"Bearer {cust_token}"})
    assert r_cust_list.status_code == 200
    assert r_cust_list.json()["items"][0]["agent_id"] is None


@pytest.mark.asyncio
async def test_ticket_search_and_pagination_isolation(client: AsyncClient):
    tok_a = await _register(client, "BizSearchA", "admin-search-a@biz.com")
    cust_a = await _create_user(client, tok_a["access_token"], "cust-search-a@biz.com", "customer")
    c_a_token = (await _login(client, "cust-search-a@biz.com"))["access_token"]

    tok_b = await _register(client, "BizSearchB", "admin-search-b@biz.com")
    cust_b = await _create_user(client, tok_b["access_token"], "cust-search-b@biz.com", "customer")
    c_b_token = (await _login(client, "cust-search-b@biz.com"))["access_token"]

    # Customer A creates 3 tickets
    await _create_ticket(client, c_a_token, "ALPHA issue with printer")
    await _create_ticket(client, c_a_token, "ALPHA payment failure")
    await _create_ticket(client, c_a_token, "BETA network down")

    # Customer B creates 1 ticket with ALPHA in subject
    await _create_ticket(client, c_b_token, "ALPHA secret server down")

    # Customer A searches "ALPHA" -> gets only 2 tickets from Biz A
    r_a = await client.get("/tickets?search=ALPHA", headers={"Authorization": f"Bearer {c_a_token}"})
    assert r_a.status_code == 200
    data_a = r_a.json()
    assert data_a["total"] == 2
    assert len(data_a["items"]) == 2
    for item in data_a["items"]:
        assert "ALPHA" in item["subject"]
        assert "secret server" not in item["subject"]

    # Customer B searches "ALPHA" -> gets only 1 ticket from Biz B
    r_b = await client.get("/tickets?search=ALPHA", headers={"Authorization": f"Bearer {c_b_token}"})
    assert r_b.status_code == 200
    data_b = r_b.json()
    assert data_b["total"] == 1
    assert data_b["items"][0]["subject"] == "ALPHA secret server down"

    # Pagination test for Customer A
    r_page1 = await client.get("/tickets?limit=2&page=1", headers={"Authorization": f"Bearer {c_a_token}"})
    assert r_page1.status_code == 200
    p1 = r_page1.json()
    assert p1["total"] == 3
    assert len(p1["items"]) == 2
    assert p1["page"] == 1
    assert p1["pages"] == 2

    r_page2 = await client.get("/tickets?limit=2&page=2", headers={"Authorization": f"Bearer {c_a_token}"})
    assert r_page2.status_code == 200
    p2 = r_page2.json()
    assert len(p2["items"]) == 1
    assert p2["page"] == 2
    # Ensure items don't overlap
    assert p1["items"][0]["id"] != p2["items"][0]["id"]
