from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    business_id: int

    model_config = {"from_attributes": True}
