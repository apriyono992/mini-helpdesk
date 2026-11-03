from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser
from app.db.session import AsyncSessionDep
from app.models.user import UserRole
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate
from app.schemas.error import ErrorResponse
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["categories"])


def _require_admin(user: CurrentUser) -> CurrentUser:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user


@router.get(
    "",
    response_model=list[CategoryOut],
    summary="List ticket categories",
    description="Returns all ticket categories available for the user's business tenant.",
)
async def list_categories(user: CurrentUser, session: AsyncSessionDep):
    return await category_service.list_categories(user.business_id, session)


@router.post(
    "",
    response_model=CategoryOut,
    status_code=201,
    summary="Create ticket category",
    description="Creates a new category for the business tenant. Admin only.",
    responses={
        400: {"model": ErrorResponse, "description": "Category name already exists"},
        403: {"model": ErrorResponse, "description": "Admin access required"},
    },
)
async def create_category(data: CategoryCreate, user: CurrentUser, session: AsyncSessionDep):
    _require_admin(user)
    return await category_service.create_category(data, user.business_id, session)


@router.patch(
    "/{category_id}",
    response_model=CategoryOut,
    summary="Update ticket category",
    description="Updates existing category name or color. Admin only.",
    responses={
        403: {"model": ErrorResponse, "description": "Admin access required"},
        404: {"model": ErrorResponse, "description": "Category not found"},
    },
)
async def update_category(
    category_id: int, data: CategoryUpdate, user: CurrentUser, session: AsyncSessionDep
):
    _require_admin(user)
    return await category_service.update_category(category_id, data, user.business_id, session)


@router.delete(
    "/{category_id}",
    status_code=204,
    summary="Delete ticket category",
    description="Removes category from business tenant. Admin only.",
    responses={
        403: {"model": ErrorResponse, "description": "Admin access required"},
        404: {"model": ErrorResponse, "description": "Category not found"},
    },
)
async def delete_category(category_id: int, user: CurrentUser, session: AsyncSessionDep):
    _require_admin(user)
    await category_service.delete_category(category_id, user.business_id, session)
