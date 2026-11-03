from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import CurrentUser
from app.db.session import AsyncSessionDep
from app.models.user import UserRole
from app.schemas.user import UserCreate, UserOut
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


def _require_admin(user: CurrentUser) -> CurrentUser:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user


@router.get("", response_model=list[UserOut])
async def list_users(user: CurrentUser, session: AsyncSessionDep):
    _require_admin(user)
    return await user_service.list_users(user.business_id, session)


@router.post("", response_model=UserOut, status_code=201)
async def create_user(data: UserCreate, user: CurrentUser, session: AsyncSessionDep):
    _require_admin(user)
    return await user_service.create_user(data, user.business_id, session)
