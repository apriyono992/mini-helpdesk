from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TicketRead(Base):
    __tablename__ = "ticket_reads"
    __table_args__ = (UniqueConstraint("ticket_id", "user_id", name="uq_ticket_read_user"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    last_read_message_id: Mapped[int] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    ticket: Mapped["Ticket"] = relationship()  # noqa: F821
    user: Mapped["User"] = relationship()  # noqa: F821
