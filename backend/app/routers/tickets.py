from fastapi import APIRouter, File, Query, UploadFile

from app.core.deps import CurrentUser
from app.db.session import AsyncSessionDep
from app.models.ticket import TicketPriority, TicketStatus
from app.schemas.error import ErrorResponse
from app.schemas.ticket import AttachmentOut, TicketCreate, TicketOut, TicketPaginationOut, TicketPatch
from app.schemas.message import MessageOut
from app.services import ticket_service
from app.services.chat_manager import manager

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post(
    "",
    response_model=TicketOut,
    status_code=201,
    summary="Create a new ticket",
    description="Creates a new support ticket with initial message.",
)
async def create_ticket(data: TicketCreate, user: CurrentUser, session: AsyncSessionDep):
    ticket = await ticket_service.create_ticket(data, user, session)
    await manager.broadcast_business(user.business_id, {
        "type": "ticket_created",
        "ticket_id": ticket.id,
        "subject": ticket.subject,
        "customer_id": ticket.customer_id,
    })
    return ticket


@router.get(
    "",
    response_model=TicketPaginationOut,
    summary="List tickets with pagination and filtering",
    description="Returns tickets in tenant business with optional filters for status, category, priority, search query, assignment, and agent ID.",
)
async def list_tickets(
    user: CurrentUser,
    session: AsyncSessionDep,
    status: TicketStatus | None = Query(default=None, description="Filter by status (open, in_progress, resolved, closed)"),
    category: str | None = Query(default=None, description="Filter by category"),
    priority: TicketPriority | None = Query(default=None, description="Filter by priority (low, medium, high)"),
    search: str | None = Query(default=None, description="Search ticket subject or #ID"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    assigned: str | None = Query(default=None, pattern="^(unassigned|mine)$", description="Filter assigned to current agent or unassigned"),
    agent_id: int | None = Query(default=None, description="Filter by assigned agent ID"),
):
    return await ticket_service.list_tickets(
        user,
        session,
        status_filter=status,
        category_filter=category,
        priority_filter=priority,
        search=search,
        page=page,
        limit=limit,
        assigned=assigned,
        filter_agent_id=agent_id,
    )


@router.get(
    "/{ticket_id}",
    response_model=TicketOut,
    summary="Get ticket details",
    description="Retrieves ticket details and marks unread messages as read.",
    responses={404: {"model": ErrorResponse, "description": "Ticket not found"}},
)
async def get_ticket(ticket_id: int, user: CurrentUser, session: AsyncSessionDep):
    ticket = await ticket_service.get_ticket(ticket_id, user, session)
    max_id = await ticket_service.mark_ticket_read(ticket_id, user, session)
    if max_id:
        await manager.broadcast(ticket_id, {
            "type": "read_receipt",
            "user_id": user.id,
            "last_read_id": max_id,
        })
    return ticket


@router.post(
    "/{ticket_id}/read",
    status_code=204,
    summary="Mark ticket messages as read",
    description="Updates message read watermark and broadcasts read receipts.",
    responses={404: {"model": ErrorResponse, "description": "Ticket not found"}},
)
async def mark_ticket_read(ticket_id: int, user: CurrentUser, session: AsyncSessionDep):
    max_id = await ticket_service.mark_ticket_read(ticket_id, user, session)
    if max_id:
        await manager.broadcast(ticket_id, {
            "type": "read_receipt",
            "user_id": user.id,
            "last_read_id": max_id,
        })


@router.patch(
    "/{ticket_id}",
    response_model=TicketOut,
    summary="Update ticket status or assignee",
    description="Applies state machine transitions or reassigns agent. Enforces strict state rules.",
    responses={
        400: {"model": ErrorResponse, "description": "Invalid status transition or assignment"},
        404: {"model": ErrorResponse, "description": "Ticket not found"},
    },
)
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


@router.post(
    "/{ticket_id}/attachments",
    response_model=AttachmentOut,
    summary="Upload ticket attachment",
    description="Uploads file attachment for ticket and returns static URL.",
    responses={
        400: {"model": ErrorResponse, "description": "File validation error or ticket closed"},
        404: {"model": ErrorResponse, "description": "Ticket not found"},
    },
)
async def upload_ticket_attachment(
    ticket_id: int,
    user: CurrentUser,
    session: AsyncSessionDep,
    file: UploadFile = File(..., description="Attachment file to upload"),
):
    url = await ticket_service.upload_attachment(ticket_id, file, user, session)
    return {"attachment_url": url}


@router.get(
    "/{ticket_id}/messages",
    response_model=list[MessageOut],
    summary="List ticket messages",
    description="Retrieves chronological message history with cursor-based pagination.",
    responses={404: {"model": ErrorResponse, "description": "Ticket not found"}},
)
async def list_messages(
    ticket_id: int,
    user: CurrentUser,
    session: AsyncSessionDep,
    limit: int = Query(default=20, ge=1, le=100, description="Max messages to return"),
    before_id: int | None = Query(default=None, description="Cursor for pagination before message ID"),
):
    return await ticket_service.list_messages(ticket_id, user, session, limit=limit, before_id=before_id)
