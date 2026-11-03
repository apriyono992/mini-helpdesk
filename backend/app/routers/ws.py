from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.security import decode_token
from app.db.session import AsyncSessionLocal
from app.models.message import Message
from app.models.ticket import Ticket, TicketStatus
from app.models.user import User, UserRole
from app.services import ticket_service
from app.services.chat_manager import manager
import jwt

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/tickets/{ticket_id}")
async def ticket_ws(ticket_id: int, websocket: WebSocket, token: str = ""):
    """Validate token and ticket access BEFORE accept(). Reject with 1008."""
    async with AsyncSessionLocal() as session:
        # Validate token
        try:
            payload = decode_token(token)
        except (jwt.ExpiredSignatureError, jwt.PyJWTError):
            await websocket.close(code=1008)
            return

        if payload.get("type") != "access":
            await websocket.close(code=1008)
            return

        user_id = int(payload["sub"])
        user_result = await session.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user is None:
            await websocket.close(code=1008)
            return

        # Validate ticket access
        ticket_result = await session.execute(select(Ticket).where(Ticket.id == ticket_id))
        ticket = ticket_result.scalar_one_or_none()
        if ticket is None or ticket.business_id != user.business_id:
            await websocket.close(code=1008)
            return
        if user.role == UserRole.customer and ticket.customer_id != user.id:
            await websocket.close(code=1008)
            return
        if user.role == UserRole.agent and ticket.agent_id is not None and ticket.agent_id != user.id:
            await websocket.close(code=1008)
            return

    await manager.connect(ticket_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type", "message")

            if event_type == "typing":
                display_name = "Agent" if user.role == UserRole.agent else user.full_name
                await manager.broadcast(ticket_id, {
                    "type": "typing",
                    "user_id": user_id,
                    "user_name": display_name,
                    "is_typing": bool(data.get("is_typing", True)),
                })
                continue

            if event_type == "read":
                async with AsyncSessionLocal() as session:
                    max_id = await ticket_service.mark_ticket_read(ticket_id, user, session)
                    if max_id:
                        await manager.broadcast(ticket_id, {
                            "type": "read_receipt",
                            "user_id": user_id,
                            "last_read_id": max_id,
                        })
                continue

            body = (data.get("body") or "").strip()
            attachment_url = data.get("attachment_url")
            if not body and not attachment_url:
                continue

            # Fallback text if body is empty but attachment is present
            if not body and attachment_url:
                body = "Sent an attachment"

            async with AsyncSessionLocal() as session:
                # Re-check ticket status (closed rejects messages)
                ticket_result = await session.execute(select(Ticket).where(Ticket.id == ticket_id))
                ticket = ticket_result.scalar_one_or_none()
                if ticket is None or ticket.status == TicketStatus.closed:
                    await websocket.send_json({"error": "Ticket is closed"})
                    continue

                msg = Message(
                    ticket_id=ticket_id,
                    sender_id=user_id,
                    body=body,
                    attachment_url=attachment_url,
                )
                session.add(msg)
                await session.commit()
                await session.refresh(msg)

            await manager.broadcast(ticket_id, {
                "type": "message",
                "id": msg.id,
                "ticket_id": ticket_id,
                "sender_id": user_id,
                "body": body,
                "attachment_url": attachment_url,
                "created_at": msg.created_at.isoformat(),
            })
            await manager.broadcast_business(user.business_id, {
                "type": "new_message",
                "ticket_id": ticket_id,
                "sender_id": user_id,
            })
    except (WebSocketDisconnect, Exception):
        manager.disconnect(ticket_id, websocket)


@router.websocket("/ws/business")
async def business_ws(websocket: WebSocket, token: str = ""):
    """Validate token BEFORE accept(). Reject with 1008."""
    async with AsyncSessionLocal() as session:
        try:
            payload = decode_token(token)
        except (jwt.ExpiredSignatureError, jwt.PyJWTError):
            await websocket.close(code=1008)
            return

        if payload.get("type") != "access":
            await websocket.close(code=1008)
            return

        user_id = int(payload["sub"])
        user_result = await session.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user is None:
            await websocket.close(code=1008)
            return

    business_id = user.business_id
    await manager.connect_business(business_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except (WebSocketDisconnect, Exception):
        manager.disconnect_business(business_id, websocket)
