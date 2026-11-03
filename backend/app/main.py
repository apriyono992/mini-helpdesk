from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.errors import http_exception_handler, validation_exception_handler
from app.routers import auth, users, tickets, ws

app = FastAPI(title="HelpDesk Mini")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tickets.router)
app.include_router(ws.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
