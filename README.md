# HelpDesk Mini

Multi-tenant ticketing app. Backend FastAPI + Frontend Next.js App Router.

## Quick Start

### Satu Perintah via Docker Compose

Jalankan seluruh stack (Postgres + auto migration & seed + Backend + Frontend):

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend & Swagger: http://localhost:8000 / http://localhost:8000/docs

---

### Manual Setup

#### 1. Environment Configuration

Cukup buat 1 file `.env` di root direktori project:

```bash
cp .env.example .env
```

#### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Backend runs at http://localhost:8000 — Swagger UI at http://localhost:8000/docs

#### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:3000

#### 4. Seed demo data (optional)

```bash
cd backend
source .venv/bin/activate
python scripts/seed.py
```

## Environment Variables (`.env`)

| Variable | Description | Default / Example |
|---|---|---|
| `POSTGRES_USER` | PostgreSQL user | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `postgrespassword` |
| `POSTGRES_DB` | PostgreSQL database name | `mini_helpdesk` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `DATABASE_URL` | PostgreSQL connection URL (host dev) | `postgresql+psycopg://postgres:pass@localhost:5432/mini_helpdesk` |
| `SECRET_KEY` | JWT signing secret (32+ chars) | `change-me-super-secret-jwt-key` |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL | `7` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000` |
| `PORT` | Frontend dev/runtime port | `3000` |
| `NEXT_PUBLIC_API_URL` | Frontend API URL | `http://localhost:8000` |
| `NEXT_PUBLIC_WS_URL` | Frontend WebSocket URL | `ws://localhost:8000` |

## Demo Accounts (after seed)

### Acme Corp
| Role | Email | Password |
|---|---|---|
| Admin | admin@acme.com | admin1234 |
| Agent | agent@acme.com | agent1234 |
| Customer | cust1@acme.com | cust1234 |
| Customer | cust2@acme.com | cust1234 |

### Globex Inc
| Role | Email | Password |
|---|---|---|
| Admin | admin@globex.com | admin1234 |
| Agent | agent@globex.com | agent1234 |
| Customer | cust1@globex.com | cust1234 |
| Customer | cust2@globex.com | cust1234 |

## Running Tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

13 tests covering: auth, tenant isolation, status machine.

## Architecture

```
backend/
  app/
    core/        # config, security (JWT/argon2), deps (get_current_user)
    db/          # SQLAlchemy async session, Base
    models/      # Business, User, Ticket, Message
    schemas/     # Pydantic input/output (no password fields in output)
    routers/     # HTTP + WebSocket endpoints (no business logic here)
    services/    # All business logic + tenant filtering
  alembic/       # DB migrations
  scripts/       # seed.py
  tests/

frontend/
  app/           # Next.js App Router pages
  components/    # TicketList, ChatPanel, TicketInfoPanel, StatusBadge
  hooks/         # useAuth, useTicketSocket
  lib/           # api.ts (all fetches), auth.ts, ws.ts, types.ts
```

## Ticket Status Machine

```
open → in_progress → resolved → closed
resolved → open   (customer owner only)
closed → *        (no exit)
```

Enforced in one place: `backend/app/services/ticket_service.py`.

## Security

- Passwords hashed with argon2. Never in any response.
- All ticket/message queries filter by `business_id` from token (never from request body).
- Cross-business access → 404 (not 403, not the data).
- WebSocket validates token + ticket access **before** `accept()`. Rejects with close code 1008.
- `.env` files are gitignored. See `.env.example` for required vars.

## Notes & Decisions

- **SQLite not used**: PostgreSQL required for production correctness (async driver `psycopg`).
- **No refresh token rotation**: Single refresh token per login. Add rotation when adding token revocation store.
- **No pagination**: Ticket list returns all. Add `?page=&limit=` with offset query when ticket count grows.
- **WebSocket token via query param**: Standard approach for browser WS (headers not supported). Token is short-lived (30 min).
- **Frontend auth is client-side only**: No server-side session. Redirect on 401 handled in `api.ts`.
- **`cacheComponents: false`** in `next.config.ts`: All pages are client-auth-gated; Cache Components (Next.js 16 default) requires server-side data patterns incompatible with client-only auth flow.
