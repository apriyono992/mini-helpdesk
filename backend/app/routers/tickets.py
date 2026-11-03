from fastapi import APIRouter, File, Query, UploadFile

from app.core.deps import CurrentUser
from app.db.session import AsyncSessionDep
from app.models.ticket import TicketStatus
from app.schemas.ticket import TicketCreate, TicketOut, TicketPaginationOut, TicketPatch
from app.schemas.message import MessageOut
from app.services import ticket_service
from app.services.chat_manager import manager

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("", response_model=TicketOut, status_code=201)
async def create_ticket(data: TicketCreate, user: CurrentUser, session: AsyncSessionDep):
    ticket = await ticket_service.create_ticket(data, user, session)
    await manager.broadcast_business(user.business_id, {
        "type": "ticket_created",
        "ticket_id": ticket.id,
        "subject": ticket.subject,
        "customer_id": ticket.customer_id,
    })
    return ticket


@router.get("", response_model=TicketPaginationOut)
async def list_tickets(
    user: CurrentUser,
    session: AsyncSessionDep,
    status: TicketStatus | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    return await ticket_service.list_tickets(
        user,
        session,
        status_filter=status,
        search=search,
        page=page,
        limit=limit,
    )


@router.get("/{ticket_id}", response_model=TicketOut)
async def get_ticket(ticket_id: int, user: CurrentUser, session: AsyncSessionDep):
    return await ticket_service.get_ticket(ticket_id, user, session)


@router.post("/{ticket_id}/read", status_code=204)
async def mark_ticket_read(ticket_id: int, user: CurrentUser, session: AsyncSessionDep):
    await ticket_service.mark_ticket_read(ticket_id, user, session)


@router.patch("/{ticket_id}", response_model=TicketOut)
async def patch_ticket(ticket_id: int, data: TicketPatch, user: CurrentUser, session: AsyncSessionDep):
    ticket = await ticket_service.patch_ticket(ticket_id, data, user, session)
    await manager.broadcast(ticket_id, {
        "type": "ticket_update",
        "id": ticket.id,
        "status": ticket.status,
        "agent_id": ticket.agent_id,
    })
    await manager.broadcast_business(user.business_id, {
        "type": "ticket_update",
        "id": ticket.id,
        "status": ticket.status,
        "agent_id": ticket.agent_id,
    })
    return ticket


@router.post("/{ticket_id}/attachments")
async def upload_ticket_attachment(
    ticket_id: int,
    user: CurrentUser,
    session: AsyncSessionDep,
    file: UploadFile = File(...),
):
    url = await ticket_service.upload_attachment(ticket_id, file, user, session)
    return {"attachment_url": url}


@router.get("/{ticket_id}/messages", response_model=list[MessageOut])
async def list_messages(
    ticket_id: int,
    user: CurrentUser,
    session: AsyncSessionDep,
    limit: int = Query(default=20, ge=1, le=100),
    before_id: int | None = Query(default=None),
):
    return await ticket_service.list_messages(ticket_id, user, session, limit=limit, before_id=before_id)
