# HelpDesk Mini

Aplikasi helpdesk ticketing multi-tenant. Backend dibangun menggunakan FastAPI (Python 3.11+) dan PostgreSQL, frontend menggunakan Next.js (App Router) + TypeScript + Tailwind CSS.

Setiap user terikat ke satu bisnis dan satu peran (`admin`, `agent`, `customer`).

---

## Prasyarat Sistem

- **Python**: 3.11 atau lebih baru
- **Node.js**: 18.x atau lebih baru (disertai `npm`)
- **PostgreSQL**: 15+ (atau Docker)
- **Docker & Docker Compose** (opsional untuk menjalankan stack secara kontainer)

---

## Cara Menjalankan dari Nol

### Opsi A: Menggunakan Docker Compose (Satu Perintah)

Semua dependensi (PostgreSQL, migrasi Alembic, seed data, FastAPI backend, dan Next.js frontend) berjalan otomatis:

```bash
docker compose up --build
```

Layanan siap diakses pada:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Opsi B: Setup Lokal via Makefile

Jika ingin menjalankan langsung di host mesin lokal menggunakan `make`:

#### 1. Salin Environment Variable
```bash
cp .env.example .env
```
*Pastikan database PostgreSQL lokal aktif dan sesuai dengan `DATABASE_URL` di `.env`.*

#### 2. Install Dependensi (Backend & Frontend)
```bash
make install
```
*Perintah ini otomatis membuat virtual environment Python `backend/.venv` jika belum ada, menginstall seluruh paket Python di backend, dan menginstall dependensi npm di frontend.*

#### 3. Migrasi Database & Masukkan Data Demo
```bash
make migrate
make seed
```

#### 4. Jalankan Aplikasi
```bash
make dev
```
*Perintah ini menjalankan server backend FastAPI (`http://localhost:8000`) dan frontend Next.js (`http://localhost:3000`) secara bersamaan dalam satu terminal.*

---

### Cara Masuk & Mengakses Project

Setelah server berjalan (`docker compose` atau `make dev`), akses aplikasi melalui browser:

1. **Aplikasi Web**: [http://localhost:3000](http://localhost:3000) (otomatis dialihkan ke `/login` jika belum autentikasi)
2. **Halaman Login**: [http://localhost:3000/login](http://localhost:3000/login)
3. **Pendaftaran Bisnis Baru**: [http://localhost:3000/register](http://localhost:3000/register)
4. **Dokumentasi API Interaktif**:
   - Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
   - ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

#### Login Cepat dengan Akun Demo (Seed)

Gunakan kredensial berikut untuk masuk dan menguji alur multi-tenant:

**Bisnis 1: Acme Corp**
| Peran | Email | Password | Halaman Masuk Utama |
|---|---|---|---|
| **Admin** | `admin@acme.com` | `admin1234` | `/tickets`, `/admin/users`, `/admin/categories` |
| **Agent** | `agent@acme.com` | `agent1234` | `/tickets` (ambil tiket unassigned & respon chat) |
| **Customer 1** | `cust1@acme.com` | `cust1234` | `/tickets` (buat tiket baru & chat privat) |
| **Customer 2** | `cust2@acme.com` | `cust1234` | `/tickets` (terisolasi dari tiket customer 1) |

**Bisnis 2: Globex Inc (Isolasi Antar-Tenant)**
| Peran | Email | Password | Catatan Akses |
|---|---|---|---|
| **Admin** | `admin@globex.com` | `admin1234` | Tidak bisa melihat data Acme Corp |
| **Agent** | `agent@globex.com` | `agent1234` | Hanya tiket Globex Inc |
| **Customer 1** | `cust1@globex.com` | `cust1234` | Tidak bisa akses tiket Acme Corp (404) |

---

### Daftar Perintah Makefile

| Perintah | Deskripsi |
|---|---|
| `make install` | Buat venv Python & install semua dependensi backend + frontend |
| `make migrate` | Jalankan migrasi skema database Alembic (`upgrade head`) |
| `make seed` | Isi database dengan 2 tenant demo bisnis dan pengguna |
| `make dev` | Jalankan server backend dan frontend bersamaan |
| `make backend` | Jalankan hanya server backend FastAPI (`:8000`) |
| `make frontend` | Jalankan hanya server frontend Next.js (`:3000`) |
| `make test` | Jalankan seluruh unit & integration test pytest |
| `make docker-up` | Jalankan seluruh stack via Docker Compose di background |
| `make docker-down` | Hentikan container Docker Compose |

---

## Environment Variables (`.env` & `.env.example`)

File `.env.example` disediakan di root repositori sebagai template tanpa secret asli. Jangan commit file `.env` ke version control.

| Variabel | Deskripsi | Default / Nilai Dummy |
|---|---|---|
| `POSTGRES_USER` | Username database PostgreSQL | `postgres` |
| `POSTGRES_PASSWORD` | Password database PostgreSQL | `postgrespassword` |
| `POSTGRES_DB` | Nama database PostgreSQL | `mini_helpdesk` |
| `POSTGRES_PORT` | Port PostgreSQL pada host | `5432` |
| `DATABASE_URL` | Koneksi database SQLAlchemy async | `postgresql+psycopg://postgres:postgrespassword@localhost:5432/mini_helpdesk` |
| `SECRET_KEY` | Secret key penandatanganan JWT (min 32 char) | `change-me-super-secret-jwt-key-min-32-chars` |
| `ALGORITHM` | Algoritma enkripsi JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Masa berlaku access token (menit) | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Masa berlaku refresh token (hari) | `7` |
| `CORS_ORIGINS` | Domain asal yang diizinkan untuk CORS | `http://localhost:3000` |
| `BACKEND_PORT` | Port service backend | `8000` |
| `PORT` | Port service frontend | `3000` |
| `NEXT_PUBLIC_API_URL` | Base URL API backend untuk browser | `http://localhost:8000` |
| `NEXT_PUBLIC_WS_URL` | Base URL WebSocket untuk browser | `ws://localhost:8000` |
| `R2_ACCOUNT_ID` | Cloudflare account ID untuk storage R2 (opsional) | `your-cloudflare-account-id` |
| `R2_ACCESS_KEY_ID` | S3 Access Key ID untuk Cloudflare R2 (opsional) | `your-r2-access-key-id` |
| `R2_SECRET_ACCESS_KEY` | S3 Secret Access Key untuk Cloudflare R2 (opsional) | `your-r2-secret-access-key` |
| `R2_BUCKET_NAME` | Nama bucket Cloudflare R2 (opsional) | `your-r2-bucket-name` |
| `R2_PUBLIC_URL` | Base public URL bucket R2 (opsional) | `https://pub-your-bucket.r2.dev` |
| `R2_ENDPOINT_URL` | Custom S3 endpoint URL R2 (opsional) | `https://<account-id>.r2.cloudflarestorage.com` |

*Catatan: Jika variabel R2 tidak diisi, attachment otomatis disimpan ke penyimpanan lokal (`backend/uploads/`).*


---

## Seed Data & Akun Demo

Jalankan script seed data:

```bash
make seed
# atau secara manual:
# cd backend && .venv/bin/python scripts/seed.py
```

Script bersifat **idempotent** (aman dijalankan berulang tanpa duplikasi data). Script membuat 2 bisnis terisolasi beserta kategori dan 4 akun per bisnis:

### 1. Acme Corp

| Role | Nama Lengkap | Email | Password |
|---|---|---|---|
| **Admin** | Acme Admin | `admin@acme.com` | `admin1234` |
| **Agent** | Acme Agent | `agent@acme.com` | `agent1234` |
| **Customer 1** | Acme Customer 1 | `cust1@acme.com` | `cust1234` |
| **Customer 2** | Acme Customer 2 | `cust2@acme.com` | `cust1234` |

### 2. Globex Inc

| Role | Nama Lengkap | Email | Password |
|---|---|---|---|
| **Admin** | Globex Admin | `admin@globex.com` | `admin1234` |
| **Agent** | Globex Agent | `agent@globex.com` | `agent1234` |
| **Customer 1** | Globex Customer 1 | `cust1@globex.com` | `cust1234` |
| **Customer 2** | Globex Customer 2 | `cust2@globex.com` | `cust1234` |

---

## Dokumentasi API & Swagger

FastAPI secara otomatis menghasilkan dokumentasi interaktif OpenAPI:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI Schema (JSON)**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

Untuk mencoba request endpoint terproteksi di Swagger:
1. Panggil `POST /auth/login` menggunakan akun demo.
2. Salin nilai `access_token`.
3. Klik tombol **Authorize** (ikon gembok) di pojok kanan atas Swagger UI.
4. Tempelkan token (tanpa prefix `Bearer `) lalu klik **Authorize**.

---

## Menjalankan Pengujian (Testing)

### Backend

```bash
make test
# atau secara manual:
# cd backend && .venv/bin/pytest tests/ -v
```

Total **40 tes** mencakup:
- `test_auth.py`: registrasi bisnis, login (dengan rate limiting), refresh token, endpoint `/me`.
- `test_categories.py`: CRUD kategori tenant dan proteksi role admin.
- `test_isolation.py`: isolasi data antar-tenant, proteksi akses silang tiket/pesan (return 404), filter unassigned agent.
- `test_storage.py`: konversi gambar ke format WebP (Pillow), fallback lokal, dan upload Cloudflare R2 (boto3).
- `test_ticket_status.py`: mesin status tiket (`open` → `in_progress` → `resolved` → `closed`), aturan transisi, dan proteksi reopen.
- `test_ws.py`: koneksi WebSocket, validasi token sebelum handshake (close code 1008), broadcast pesan & read receipt.
- `test_openapi.py`: integritas skema OpenAPI `/openapi.json` dan ketersediaan `/docs`.


### Frontend

```bash
cd frontend
npm run lint && npm run build
```

---

## Struktur Proyek

```
.
├── .env.example              # Template konfigurasi environment root
├── docker-compose.yml        # Orkestrasi container Postgres, backend, frontend, migrasi
├── backend/
│   ├── alembic/              # Skrip migrasi database
│   ├── app/
│   │   ├── core/             # Konfigurasi, security (argon2/JWT), rate limiter, dependencies
│   │   ├── db/               # SQLAlchemy async session
│   │   ├── models/           # ORM SQLAlchemy (Business, User, Ticket, Message, Category)
│   │   ├── schemas/          # Schema validasi Pydantic (input/output/error)
│   │   ├── routers/          # Endpoint API (HTTP & WebSocket)
│   │   └── services/         # Business logic, filter tenant, ticket state machine
│   ├── scripts/
│   │   └── seed.py           # Script data demo (2 bisnis × 4 user)
│   └── tests/                # Automated pytest suite
└── frontend/
    ├── app/                  # Next.js App Router (pages: auth, tickets, admin)
    ├── components/           # Komponen UI (TicketList, ChatPanel, InfoPanel, dsb.)
    ├── hooks/                # Custom React hooks (useAuth, useTicketSocket)
    └── lib/                  # Client API (api.ts), types (types.ts), auth store, websocket
```

---

## Mesin Status Tiket

```
open ────► in_progress ────► resolved ────► closed
  ▲                              │
  └──────────────────────────────┘
     (hanya customer pemilik)
```

Aturan:
1. `closed` bersifat terminal: tidak ada transisi keluar dan menolak pesan baru.
2. Hanya customer pemilik tiket yang boleh mengembalikan status dari `resolved` ke `open`.
3. Logika status machine terpusat secara eksklusif di `backend/app/services/ticket_service.py`.

---

## Standar Keamanan

1. **Hash Password**: Disimpan menggunakan algoritma `argon2-cffi`. Tidak pernah disertakan pada output skema maupun log.
2. **Isolasi Tenant Ketat**: Setiap query database tiket/pesan/kategori wajib memfilter `business_id` dari token sesi yang tervalidasi.
3. **Response 404 untuk Akses Tak Berhak**: Mencoba mengakses tiket milik customer lain atau bisnis lain menghasilkan kode status `404 Not Found` (mencegah information disclosure).
4. **WebSocket Pre-Handshake Auth**: Verifikasi JWT dan hak akses tiket dilakukan **sebelum** koneksi di-accept. Penolakan menghasilkan close code `1008 Policy Violation`.
