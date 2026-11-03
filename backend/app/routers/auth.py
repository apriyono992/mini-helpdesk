from fastapi import APIRouter

from app.db.session import AsyncSessionDep
from app.schemas.auth import RegisterBusiness, LoginRequest, TokenResponse, RefreshRequest, UserOut
from app.services import auth_service
from app.core.deps import CurrentUser

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/registerbusiness", response_model=TokenResponse, status_code=201)
async def register_business(data: RegisterBusiness, session: AsyncSessionDep):
    return await auth_service.register_business(data, session)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, session: AsyncSessionDep):
    return await auth_service.login(data, session)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, session: AsyncSessionDep):
    return await auth_service.refresh(data, session)


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser):
    return UserOut.model_validate(user)
