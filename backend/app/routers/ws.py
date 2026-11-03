from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.security import decode_token
from app.db.session import AsyncSessionLocal
from app.models.message import Message
from app.models.ticket import Ticket, TicketStatus
from app.models.user import User, UserRole
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
        if user.role == UserRole.agent and ticket.agent_id != user.id:
            await websocket.close(code=1008)
            return

    await manager.connect(ticket_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            body = (data.get("body") or "").strip()
            if not body:
                continue

            async with AsyncSessionLocal() as session:
                # Re-check ticket status (closed rejects messages)
                ticket_result = await session.execute(select(Ticket).where(Ticket.id == ticket_id))
                ticket = ticket_result.scalar_one_or_none()
                if ticket is None or ticket.status == TicketStatus.closed:
                    await websocket.send_json({"error": "Ticket is closed"})
                    continue

                msg = Message(ticket_id=ticket_id, sender_id=user_id, body=body)
                session.add(msg)
                await session.commit()
                await session.refresh(msg)

            await manager.broadcast(ticket_id, {
                "type": "message",
                "id": msg.id,
                "ticket_id": ticket_id,
                "sender_id": user_id,
                "body": body,
                "created_at": msg.created_at.isoformat(),
            })
    except (WebSocketDisconnect, Exception):
        manager.disconnect(ticket_id, websocket)
