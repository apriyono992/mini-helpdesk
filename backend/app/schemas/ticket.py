from datetime import datetime
from pydantic import BaseModel
from app.models.ticket import TicketStatus


class TicketCreate(BaseModel):
    subject: str
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
    status: TicketStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
