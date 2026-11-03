from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.business import Business
from app.models.user import User, UserRole
from app.schemas.auth import RegisterBusiness, LoginRequest, TokenResponse, RefreshRequest
import jwt


async def register_business(data: RegisterBusiness, session: AsyncSession) -> TokenResponse:
    business = Business(name=data.business_name)
    session.add(business)
    await session.flush()  # get business.id

    user = User(
        business_id=business.id,
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.admin,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return TokenResponse(
        access_token=create_access_token(user.id, user.business_id),
        refresh_token=create_refresh_token(user.id, user.business_id),
    )


async def login(data: LoginRequest, session: AsyncSession) -> TokenResponse:
    result = await session.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"code": "invalid_credentials"},
        )
    return TokenResponse(
        access_token=create_access_token(user.id, user.business_id),
        refresh_token=create_refresh_token(user.id, user.business_id),
    )


async def refresh(data: RefreshRequest, session: AsyncSession) -> TokenResponse:
    try:
        payload = decode_token(data.refresh_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user_id = int(payload["sub"])
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(user.id, user.business_id),
        refresh_token=create_refresh_token(user.id, user.business_id),
    )
