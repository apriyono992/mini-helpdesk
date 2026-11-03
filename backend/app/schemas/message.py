from datetime import datetime
from pydantic import BaseModel


class MessageOut(BaseModel):
    id: int
    ticket_id: int
    sender_id: int
    body: str
    attachment_url: str | None = None
    is_read: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}
