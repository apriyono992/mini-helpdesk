import enum

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    agent = "agent"
    customer = "customer"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("business_id", "email", name="uq_user_business_email"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)

    business: Mapped["Business"] = relationship(back_populates="users")  # noqa: F821
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="customer", foreign_keys="Ticket.customer_id")  # noqa: F821
    assigned_tickets: Mapped[list["Ticket"]] = relationship(back_populates="agent", foreign_keys="Ticket.agent_id")  # noqa: F821
    messages: Mapped[list["Message"]] = relationship(back_populates="sender")  # noqa: F821
