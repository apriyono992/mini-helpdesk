from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import hash_password
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserOut


async def list_users(business_id: int, session: AsyncSession) -> list[UserOut]:
    result = await session.execute(select(User).where(User.business_id == business_id))
    return [UserOut.model_validate(u) for u in result.scalars().all()]


async def create_user(data: UserCreate, business_id: int, session: AsyncSession) -> UserOut:
    # Admin cannot create another admin
    if data.role == UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create admin user")

    existing = await session.execute(
        select(User).where(User.business_id == business_id, User.email == data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Email already in use")

    user = User(
        business_id=business_id,
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return UserOut.model_validate(user)
