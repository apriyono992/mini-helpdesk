from fastapi import APIRouter, Request

from app.core.deps import CurrentUser
from app.core.limiter import limiter
from app.db.session import AsyncSessionDep
from app.schemas.auth import RegisterBusiness, LoginRequest, TokenResponse, RefreshRequest, UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/registerbusiness", response_model=TokenResponse, status_code=201)
async def register_business(data: RegisterBusiness, session: AsyncSessionDep):
    return await auth_service.register_business(data, session)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, data: LoginRequest, session: AsyncSessionDep):
    return await auth_service.login(data, session)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, session: AsyncSessionDep):
    return await auth_service.refresh(data, session)


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser):
    return UserOut.model_validate(user)
