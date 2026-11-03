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

    # 5. Message pagination test
    # Currently ticket has first message + "halo dari test ws" = 2 messages
    r_all = await client.get(
        f"/tickets/{ticket_id}/messages?limit=10",
        headers={"Authorization": f"Bearer {c1_token}"},
    )
    assert r_all.status_code == 200
    msgs = r_all.json()
    assert len(msgs) == 2

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
