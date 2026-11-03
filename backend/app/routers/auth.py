from fastapi import APIRouter, Request

from app.core.deps import CurrentUser
from app.core.limiter import limiter
from app.db.session import AsyncSessionDep
from app.schemas.auth import RegisterBusiness, LoginRequest, TokenResponse, RefreshRequest, UserOut
from app.schemas.error import ErrorResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/registerbusiness",
    response_model=TokenResponse,
    status_code=201,
    summary="Register a new business tenant and admin user",
    description="Creates a new business tenant and initial admin account, returning JWT tokens.",
    responses={400: {"model": ErrorResponse, "description": "Email already registered"}},
)
async def register_business(data: RegisterBusiness, session: AsyncSessionDep):
    return await auth_service.register_business(data, session)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User login with email and password",
    description="Authenticates tenant user and returns access and refresh JWT tokens. Rate limited to 5 requests per minute.",
    responses={401: {"model": ErrorResponse, "description": "Invalid credentials"}},
)
@limiter.limit("5/minute")
async def login(request: Request, data: LoginRequest, session: AsyncSessionDep):
    return await auth_service.login(data, session)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="Exchanges valid refresh token for a new access token.",
    responses={401: {"model": ErrorResponse, "description": "Invalid or expired refresh token"}},
)
async def refresh(data: RefreshRequest, session: AsyncSessionDep):
    return await auth_service.refresh(data, session)


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get current user profile",
    description="Returns authenticated user profile information derived from bearer token.",
    responses={401: {"model": ErrorResponse, "description": "Unauthorized"}},
)
async def me(user: CurrentUser):
    return UserOut.model_validate(user)
