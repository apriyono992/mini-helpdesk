from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.ticket import Ticket, TicketStatus
from app.models.message import Message
from app.models.user import User, UserRole
from app.schemas.ticket import TicketCreate, TicketOut, TicketPatch
from app.schemas.message import MessageOut


async def _get_ticket_for_user(ticket_id: int, user: User, session: AsyncSession) -> Ticket:
    """Load ticket, enforce business isolation + customer ownership."""
    result = await session.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if ticket is None or ticket.business_id != user.business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    if user.role == UserRole.customer and ticket.customer_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


async def create_ticket(data: TicketCreate, user: User, session: AsyncSession) -> TicketOut:
    if user.role != UserRole.customer:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only customers can create tickets")

    ticket = Ticket(
        business_id=user.business_id,
        customer_id=user.id,
        subject=data.subject,
        status=TicketStatus.open,
    )
    session.add(ticket)
    await session.flush()

    msg = Message(ticket_id=ticket.id, sender_id=user.id, body=data.first_message)
    session.add(msg)
    await session.commit()
    await session.refresh(ticket)
    return TicketOut.model_validate(ticket)


async def list_tickets(user: User, session: AsyncSession, status_filter: TicketStatus | None) -> list[TicketOut]:
    query = select(Ticket).where(Ticket.business_id == user.business_id)
    if user.role == UserRole.customer:
        query = query.where(Ticket.customer_id == user.id)
    if status_filter:
        query = query.where(Ticket.status == status_filter)
    result = await session.execute(query.order_by(Ticket.created_at.desc()))
    return [TicketOut.model_validate(t) for t in result.scalars().all()]


async def get_ticket(ticket_id: int, user: User, session: AsyncSession) -> TicketOut:
    ticket = await _get_ticket_for_user(ticket_id, user, session)
    return TicketOut.model_validate(ticket)


def _validate_status_transition(current: TicketStatus, next_status: TicketStatus, user: User) -> None:
    """Single source of truth for status machine."""
    allowed: dict[TicketStatus, set[TicketStatus]] = {
        TicketStatus.open: {TicketStatus.in_progress},
        TicketStatus.in_progress: {TicketStatus.resolved},
        TicketStatus.resolved: {TicketStatus.closed, TicketStatus.open},
        TicketStatus.closed: set(),
    }
    if next_status not in allowed[current]:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot transition from {current} to {next_status}",
        )
    # resolved -> open only by customer owner (enforced in patch_ticket)
    if current == TicketStatus.resolved and next_status == TicketStatus.open:
        if user.role != UserRole.customer:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only customer can reopen ticket")


async def patch_ticket(ticket_id: int, data: TicketPatch, user: User, session: AsyncSession) -> TicketOut:
    ticket = await _get_ticket_for_user(ticket_id, user, session)

    if data.status is not None:
        _validate_status_transition(ticket.status, data.status, user)
        # Extra guard: resolved->open only by owner customer
        if ticket.status == TicketStatus.resolved and data.status == TicketStatus.open:
            if ticket.customer_id != user.id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        ticket.status = data.status

    if data.agent_id is not None:
        if user.role not in (UserRole.admin, UserRole.agent):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
        # Verify agent belongs to same business
        agent_result = await session.execute(
            select(User).where(User.id == data.agent_id, User.business_id == user.business_id)
        )
        if agent_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
        ticket.agent_id = data.agent_id

    await session.commit()
    await session.refresh(ticket)
    return TicketOut.model_validate(ticket)


async def list_messages(ticket_id: int, user: User, session: AsyncSession) -> list[MessageOut]:
    await _get_ticket_for_user(ticket_id, user, session)
    result = await session.execute(
        select(Message).where(Message.ticket_id == ticket_id).order_by(Message.created_at)
    )
    return [MessageOut.model_validate(m) for m in result.scalars().all()]
