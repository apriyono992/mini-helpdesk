from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.models.ticket import Ticket, TicketStatus
from app.models.message import Message
from app.models.ticket_read import TicketRead
from app.models.user import User, UserRole
from app.schemas.ticket import TicketCreate, TicketOut, TicketPaginationOut, TicketPatch
from app.schemas.message import MessageOut


def _to_ticket_out(ticket: Ticket, user: User) -> TicketOut:
    out = TicketOut.model_validate(ticket)
    if user.role == UserRole.customer:
        out.agent_id = None
    return out


async def _get_ticket_for_user(ticket_id: int, user: User, session: AsyncSession) -> Ticket:
    """Load ticket, enforce business isolation + customer ownership."""
    result = await session.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if ticket is None or ticket.business_id != user.business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    if user.role == UserRole.customer and ticket.customer_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    if user.role == UserRole.agent and ticket.agent_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


async def create_ticket(data: TicketCreate, user: User, session: AsyncSession) -> TicketOut:
    if user.role != UserRole.customer:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only customers can create tickets")

    ticket = Ticket(
        business_id=user.business_id,
        customer_id=user.id,
        subject=data.subject,
        category=data.category,
        priority=data.priority,
        status=TicketStatus.open,
    )
    session.add(ticket)
    await session.flush()

    msg = Message(ticket_id=ticket.id, sender_id=user.id, body=data.first_message)
    session.add(msg)
    await session.commit()
    await session.refresh(ticket)
    return _to_ticket_out(ticket, user)


async def _calculate_unread_counts(ticket_ids: list[int], user_id: int, session: AsyncSession) -> dict[int, int]:
    if not ticket_ids:
        return {}
    reads_res = await session.execute(
        select(TicketRead.ticket_id, TicketRead.last_read_message_id).where(
            TicketRead.ticket_id.in_(ticket_ids),
            TicketRead.user_id == user_id,
        )
    )
    last_reads = dict(reads_res.all())

    msgs_res = await session.execute(
        select(Message.ticket_id, Message.id).where(
            Message.ticket_id.in_(ticket_ids),
            Message.sender_id != user_id,
        )
    )
    unreads: dict[int, int] = {tid: 0 for tid in ticket_ids}
    for tid, mid in msgs_res.all():
        if mid > last_reads.get(tid, 0):
            unreads[tid] = unreads.get(tid, 0) + 1
    return unreads


async def mark_ticket_read(ticket_id: int, user: User, session: AsyncSession) -> None:
    await _get_ticket_for_user(ticket_id, user, session)
    latest_msg = await session.execute(
        select(func.max(Message.id)).where(Message.ticket_id == ticket_id)
    )
    max_id = latest_msg.scalar_one_or_none()
    if not max_id:
        return

    existing = await session.execute(
        select(TicketRead).where(TicketRead.ticket_id == ticket_id, TicketRead.user_id == user.id)
    )
    read_rec = existing.scalar_one_or_none()
    if read_rec:
        read_rec.last_read_message_id = max_id
    else:
        read_rec = TicketRead(
            ticket_id=ticket_id,
            user_id=user.id,
            last_read_message_id=max_id,
        )
        session.add(read_rec)
    await session.commit()


async def list_tickets(
    user: User,
    session: AsyncSession,
    status_filter: TicketStatus | None = None,
    search: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> TicketPaginationOut:
    base_query = select(Ticket).where(Ticket.business_id == user.business_id)
    if user.role == UserRole.customer:
        base_query = base_query.where(Ticket.customer_id == user.id)
    elif user.role == UserRole.agent:
        base_query = base_query.where(Ticket.agent_id == user.id)
    if status_filter:
        base_query = base_query.where(Ticket.status == status_filter)
    if search and search.strip():
        term = f"%{search.strip()}%"
        base_query = base_query.where(Ticket.subject.ilike(term))

    count_query = select(func.count()).select_from(base_query.subquery())
    total_res = await session.execute(count_query)
    total = total_res.scalar_one() or 0

    offset = (page - 1) * limit
    items_query = base_query.order_by(Ticket.updated_at.desc()).offset(offset).limit(limit)
    items_res = await session.execute(items_query)
    tickets = items_res.scalars().all()

    ticket_ids = [t.id for t in tickets]
    unread_map = await _calculate_unread_counts(ticket_ids, user.id, session)

    items = []
    for t in tickets:
        out = _to_ticket_out(t, user)
        out.unread_count = unread_map.get(t.id, 0)
        items.append(out)

    pages = (total + limit - 1) // limit if total > 0 else 1
    return TicketPaginationOut(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


async def get_ticket(ticket_id: int, user: User, session: AsyncSession) -> TicketOut:
    ticket = await _get_ticket_for_user(ticket_id, user, session)
    await mark_ticket_read(ticket_id, user, session)
    return _to_ticket_out(ticket, user)


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
    # open -> in_progress only by agent/admin
    if current == TicketStatus.open and next_status == TicketStatus.in_progress:
        if user.role == UserRole.customer:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only agent or admin can start progress")
    # in_progress -> resolved only by agent/admin
    if current == TicketStatus.in_progress and next_status == TicketStatus.resolved:
        if user.role == UserRole.customer:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only agent or admin can resolve ticket")


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
        if user.role == UserRole.customer:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
        if user.role == UserRole.agent:
            if data.agent_id != user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Agent can only self-assign")
        # Verify target is an agent in same business
        agent_result = await session.execute(
            select(User).where(
                User.id == data.agent_id,
                User.business_id == user.business_id,
                User.role == UserRole.agent,
            )
        )
        if agent_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
        ticket.agent_id = data.agent_id

    await session.commit()
    await session.refresh(ticket)
    return _to_ticket_out(ticket, user)


async def list_messages(
    ticket_id: int,
    user: User,
    session: AsyncSession,
    limit: int = 20,
    before_id: int | None = None,
) -> list[MessageOut]:
    await _get_ticket_for_user(ticket_id, user, session)
    query = select(Message).where(Message.ticket_id == ticket_id)
    if before_id is not None:
        query = query.where(Message.id < before_id)
    query = query.order_by(Message.id.desc()).limit(limit)
    result = await session.execute(query)
    messages = list(reversed(result.scalars().all()))
    return [MessageOut.model_validate(m) for m in messages]
