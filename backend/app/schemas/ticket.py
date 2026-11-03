from datetime import datetime
from pydantic import BaseModel
from app.models.ticket import TicketPriority, TicketStatus


class TicketCreate(BaseModel):
    subject: str
    category: str = "general"
    priority: TicketPriority = TicketPriority.medium
    first_message: str


class TicketPatch(BaseModel):
    agent_id: int | None = None
    status: TicketStatus | None = None


class TicketOut(BaseModel):
    id: int
    business_id: int
    customer_id: int
    agent_id: int | None
    subject: str
    category: str
    priority: TicketPriority
    status: TicketStatus
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketPaginationOut(BaseModel):
    items: list[TicketOut]
    total: int
    page: int
    limit: int
    pages: int
