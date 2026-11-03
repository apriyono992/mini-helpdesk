import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.limiter import limiter
from app.errors import http_exception_handler, validation_exception_handler, rate_limit_handler
from app.routers import auth, users, tickets, ws, categories

tags_metadata = [
    {"name": "auth", "description": "Authentication and user identity operations."},
    {"name": "users", "description": "Tenant user management. Restricted to Admin."},
    {"name": "tickets", "description": "Ticket lifecycle, messaging, transitions, attachments."},
    {"name": "categories", "description": "Ticket categories management. Restricted to Admin."},
    {"name": "websocket", "description": "Real-time ticket chat and live event updates."},
]

app = FastAPI(
    title="HelpDesk Mini API",
    description="Multi-tenant ticketing system API with role-based access control.",
    version="1.0.0",
    openapi_tags=tags_metadata,
)
app.state.limiter = limiter

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tickets.router)
app.include_router(categories.router)
app.include_router(ws.router)


@app.get("/health", tags=["system"], summary="Health check endpoint")
async def health():
    return {"status": "ok"}
