import pytest
from httpx import AsyncClient
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.main import app
from tests.conftest import _register, _login, _create_user, _create_ticket


@pytest.mark.asyncio
async def test_ws_auth_and_isolation(client: AsyncClient):
    # Setup Biz A
    tok_a = await _register(client, "WSBizA", "ws-admin-a@biz.com")
    admin_a_token = tok_a["access_token"]
    await _create_user(client, admin_a_token, "ws-cust-a1@biz.com", "customer")
    await _create_user(client, admin_a_token, "ws-cust-a2@biz.com", "customer")

    c1_tokens = await _login(client, "ws-cust-a1@biz.com")
    c1_token = c1_tokens["access_token"]
    c2_tokens = await _login(client, "ws-cust-a2@biz.com")
    c2_token = c2_tokens["access_token"]

    # Ticket created by cust-a1
    ticket = await _create_ticket(client, c1_token, "WS ticket")
    ticket_id = ticket["id"]

    # Setup Biz B
    tok_b = await _register(client, "WSBizB", "ws-admin-b@biz.com")
    admin_b_token = tok_b["access_token"]
    await _create_user(client, admin_b_token, "ws-cust-b@biz.com", "customer")
    b_tokens = await _login(client, "ws-cust-b@biz.com")
    b_token = b_tokens["access_token"]

    tc = TestClient(app)

    # 1. No token -> 1008
    with pytest.raises(WebSocketDisconnect) as exc:
        with tc.websocket_connect(f"/ws/tickets/{ticket_id}"):
            pass
    assert exc.value.code == 1008

    # 2. Other business customer -> 1008
    with pytest.raises(WebSocketDisconnect) as exc:
        with tc.websocket_connect(f"/ws/tickets/{ticket_id}?token={b_token}"):
            pass
    assert exc.value.code == 1008

    # 3. Other customer in same business -> 1008
    with pytest.raises(WebSocketDisconnect) as exc:
        with tc.websocket_connect(f"/ws/tickets/{ticket_id}?token={c2_token}"):
            pass
    assert exc.value.code == 1008

    # 4. Valid customer -> can connect and send message
    with tc.websocket_connect(f"/ws/tickets/{ticket_id}?token={c1_token}") as ws:
        ws.send_json({"body": "halo dari test ws"})
        msg = ws.receive_json()
        assert msg["type"] == "message"
        assert msg["body"] == "halo dari test ws"
        assert msg["ticket_id"] == ticket_id
        assert msg["sender_name"] == "Customer"
        assert msg["sender_role"] == "customer"

    # 5. Message pagination test
    # Currently ticket has first message + "halo dari test ws" = 2 messages
    r_all = await client.get(
        f"/tickets/{ticket_id}/messages?limit=10",
        headers={"Authorization": f"Bearer {c1_token}"},
    )
    assert r_all.status_code == 200
    msgs = r_all.json()
    assert len(msgs) == 2
    assert msgs[0]["sender_name"] == "Customer"
    assert msgs[0]["sender_role"] == "customer"

    # Test limit=1
    r_one = await client.get(
        f"/tickets/{ticket_id}/messages?limit=1",
        headers={"Authorization": f"Bearer {c1_token}"},
    )
    assert r_one.status_code == 200
    latest = r_one.json()
    assert len(latest) == 1
    assert latest[0]["id"] == msgs[1]["id"]

    # Test before_id
    r_prev = await client.get(
        f"/tickets/{ticket_id}/messages?limit=1&before_id={latest[0]['id']}",
        headers={"Authorization": f"Bearer {c1_token}"},
    )
    assert r_prev.status_code == 200
    prev_msg = r_prev.json()
    assert len(prev_msg) == 1
    assert prev_msg[0]["id"] == msgs[0]["id"]

    # 6. Closed ticket rejects message
    # Transition open -> in_progress -> resolved -> closed
    for s in ["in_progress", "resolved", "closed"]:
        await client.patch(
            f"/tickets/{ticket_id}",
            json={"status": s},
            headers={"Authorization": f"Bearer {admin_a_token}"},
        )

    with tc.websocket_connect(f"/ws/tickets/{ticket_id}?token={c1_token}") as ws:
        ws.send_json({"body": "pesan saat tutup"})
        err = ws.receive_json()
        assert "error" in err


@pytest.mark.asyncio
async def test_ws_typing_indicator(client: AsyncClient):
    tok = await _register(client, "TypingBiz", "typing-admin@biz.com")
    cust = await _create_user(client, tok["access_token"], "typing-cust@biz.com", "customer")
    cust_token = (await _login(client, "typing-cust@biz.com"))["access_token"]

    ticket = await _create_ticket(client, cust_token, "Typing Ticket")
    t_id = ticket["id"]

    tc = TestClient(app)
    with tc.websocket_connect(f"/ws/tickets/{t_id}?token={cust_token}") as ws1:
        with tc.websocket_connect(f"/ws/tickets/{t_id}?token={tok['access_token']}") as ws2:
            # Customer sends typing event
            ws1.send_json({"type": "typing", "is_typing": True})
            ev = ws2.receive_json()
            assert ev["type"] == "typing"
            assert ev["is_typing"] is True
            assert ev["user_id"] == cust["id"]


@pytest.mark.asyncio
async def test_ws_business_notifications_and_isolation(client: AsyncClient):
    tok_a = await _register(client, "WSNotifA", "wsnotif-admin-a@biz.com")
    tok_b = await _register(client, "WSNotifB", "wsnotif-admin-b@biz.com")

    cust_a = await _create_user(client, tok_a["access_token"], "wsnotif-cust-a@biz.com", "customer")
    cust_a_token = (await _login(client, "wsnotif-cust-a@biz.com"))["access_token"]

    cust_b = await _create_user(client, tok_b["access_token"], "wsnotif-cust-b@biz.com", "customer")
    cust_b_token = (await _login(client, "wsnotif-cust-b@biz.com"))["access_token"]

    tc = TestClient(app)

    # 1. Invalid token rejects with 1008
    with pytest.raises(WebSocketDisconnect) as exc:
        with tc.websocket_connect("/ws/business?token=invalidtoken"):
            pass
    assert exc.value.code == 1008

    # 2. Admin A connects to Biz A notification stream
    with tc.websocket_connect(f"/ws/business?token={tok_a['access_token']}") as ws_admin_a:
        # Cust B creates ticket in Biz B
        await _create_ticket(client, cust_b_token, "Biz B ticket")

        # Cust A creates ticket in Biz A
        t_a = await _create_ticket(client, cust_a_token, "Biz A ticket")

        # Admin A receives event for Biz A ticket ONLY
        event = ws_admin_a.receive_json()
        assert event["type"] == "ticket_created"
        assert event["ticket_id"] == t_a["id"]
        assert event["subject"] == "Biz A ticket"


@pytest.mark.asyncio
async def test_message_read_receipt_and_ws_broadcast(client: AsyncClient):
    tok = await _register(client, "ReceiptBiz", "receipt-admin@biz.com")
    admin_token = tok["access_token"]
    cust = await _create_user(client, admin_token, "receipt-cust@biz.com", "customer")
    cust_token = (await _login(client, "receipt-cust@biz.com"))["access_token"]

    ticket = await _create_ticket(client, cust_token, "Receipt Ticket")
    t_id = ticket["id"]

    # Customer checks messages: initial message created by customer has is_read = False (admin hasn't read it yet)
    r_msgs = await client.get(f"/tickets/{t_id}/messages", headers={"Authorization": f"Bearer {cust_token}"})
    assert r_msgs.status_code == 200
    msgs = r_msgs.json()
    assert len(msgs) == 1
    assert msgs[0]["is_read"] is False

    # Now admin views ticket -> marks ticket as read
    r_admin_view = await client.get(f"/tickets/{t_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert r_admin_view.status_code == 200

    # Customer re-fetches messages -> is_read is now True
    r_msgs_after = await client.get(f"/tickets/{t_id}/messages", headers={"Authorization": f"Bearer {cust_token}"})
    assert r_msgs_after.status_code == 200
    msgs_after = r_msgs_after.json()
    assert msgs_after[0]["is_read"] is True
