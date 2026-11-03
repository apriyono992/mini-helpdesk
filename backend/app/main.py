from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.limiter import limiter
from app.errors import http_exception_handler, validation_exception_handler, rate_limit_handler
from app.routers import auth, users, tickets, ws, categories

app = FastAPI(title="HelpDesk Mini")
app.state.limiter = limiter

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


@app.get("/health")
async def health():
    return {"status": "ok"}
