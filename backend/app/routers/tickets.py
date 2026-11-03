from fastapi import APIRouter, Query

from app.core.deps import CurrentUser
from app.db.session import AsyncSessionDep
from app.models.ticket import TicketStatus
from app.schemas.ticket import TicketCreate, TicketOut, TicketPatch
from app.schemas.message import MessageOut
from app.services import ticket_service
from app.services.chat_manager import manager

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("", response_model=TicketOut, status_code=201)
async def create_ticket(data: TicketCreate, user: CurrentUser, session: AsyncSessionDep):
    return await ticket_service.create_ticket(data, user, session)


@router.get("", response_model=list[TicketOut])
async def list_tickets(
    user: CurrentUser,
    session: AsyncSessionDep,
    status: TicketStatus | None = Query(default=None),
):
    return await ticket_service.list_tickets(user, session, status)


@router.get("/{ticket_id}", response_model=TicketOut)
async def get_ticket(ticket_id: int, user: CurrentUser, session: AsyncSessionDep):
    return await ticket_service.get_ticket(ticket_id, user, session)


@router.patch("/{ticket_id}", response_model=TicketOut)
async def patch_ticket(ticket_id: int, data: TicketPatch, user: CurrentUser, session: AsyncSessionDep):
    ticket = await ticket_service.patch_ticket(ticket_id, data, user, session)
    await manager.broadcast(ticket_id, {
        "type": "ticket_update",
        "id": ticket.id,
        "status": ticket.status,
        "agent_id": ticket.agent_id,
    })
    return ticket


@router.get("/{ticket_id}/messages", response_model=list[MessageOut])
async def list_messages(ticket_id: int, user: CurrentUser, session: AsyncSessionDep):
    return await ticket_service.list_messages(ticket_id, user, session)
