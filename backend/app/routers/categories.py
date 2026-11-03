from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser
from app.db.session import AsyncSessionDep
from app.models.user import UserRole
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["categories"])


def _require_admin(user: CurrentUser) -> CurrentUser:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user


@router.get("", response_model=list[CategoryOut])
async def list_categories(user: CurrentUser, session: AsyncSessionDep):
    return await category_service.list_categories(user.business_id, session)


@router.post("", response_model=CategoryOut, status_code=201)
async def create_category(data: CategoryCreate, user: CurrentUser, session: AsyncSessionDep):
    _require_admin(user)
    return await category_service.create_category(data, user.business_id, session)


@router.patch("/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: int, data: CategoryUpdate, user: CurrentUser, session: AsyncSessionDep
):
    _require_admin(user)
    return await category_service.update_category(category_id, data, user.business_id, session)


@router.delete("/{category_id}", status_code=204)
async def delete_category(category_id: int, user: CurrentUser, session: AsyncSessionDep):
    _require_admin(user)
    await category_service.delete_category(category_id, user.business_id, session)
