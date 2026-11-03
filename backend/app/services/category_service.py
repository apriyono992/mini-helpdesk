from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate


async def list_categories(business_id: int, session: AsyncSession) -> list[CategoryOut]:
    result = await session.execute(
        select(Category).where(Category.business_id == business_id).order_by(Category.name.asc())
    )
    return [CategoryOut.model_validate(c) for c in result.scalars().all()]


async def create_category(data: CategoryCreate, business_id: int, session: AsyncSession) -> CategoryOut:
    name = data.name.strip()
    category = Category(business_id=business_id, name=name)
    session.add(category)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists",
        )
    await session.refresh(category)
    return CategoryOut.model_validate(category)


async def update_category(
    category_id: int, data: CategoryUpdate, business_id: int, session: AsyncSession
) -> CategoryOut:
    result = await session.execute(
        select(Category).where(Category.id == category_id, Category.business_id == business_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    category.name = data.name.strip()
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists",
        )
    await session.refresh(category)
    return CategoryOut.model_validate(category)


async def delete_category(category_id: int, business_id: int, session: AsyncSession) -> None:
    result = await session.execute(
        select(Category).where(Category.id == category_id, Category.business_id == business_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    await session.delete(category)
    await session.commit()
