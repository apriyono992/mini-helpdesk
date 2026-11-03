# PLAN.md — HelpDesk Mini

Waktu: 5 hari kalender (estimasi 15–20 jam).
Prinsip: fitur wajib dan isolasi tenant dulu, bonus belakangan (bonus tidak dihitung jika wajib belum lengkap).

## 1. Stack

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind | Wajib |
| Data fetching | TanStack React Query | Loading/error state mudah |
| Backend | FastAPI (Python 3.11+) | WebSocket bawaan, Swagger otomatis |
| ORM + migrasi | SQLAlchemy 2.0 + Alembic | Skema wajib lewat migrasi |
| Database | PostgreSQL (SQLite hanya untuk dev cepat) | |
| Auth | JWT access + refresh (`pyjwt`), hash `argon2-cffi` | |
| Validasi | Pydantic v2 | 422 otomatis |
| Test | pytest + httpx | Fokus isolasi antar-bisnis |
| Infra | Docker Compose | Bonus |

Dependency inti backend:
`fastapi uvicorn[standard] sqlalchemy alembic psycopg[binary] pydantic-settings pyjwt argon2-cffi pytest httpx`

## 2. Struktur repo (boilerplate)

```
helpdesk-mini/
├── AGENTS.md
├── PLAN.md
├── README.md
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/versions/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, include routers
│   │   ├── core/              # config.py, security.py (hash, JWT), deps.py
│   │   ├── db/                # session.py, base.py
│   │   ├── models/            # business.py, user.py, ticket.py, message.py
│   │   ├── schemas/           # auth, user, ticket, message
│   │   ├── routers/           # auth.py, users.py, tickets.py, ws.py
│   │   ├── services/          # auth_service.py, ticket_service.py, chat_manager.py
│   │   └── errors.py          # handler error JSON konsisten
│   ├── scripts/seed.py
│   └── tests/                 # test_auth.py, test_isolation.py, test_ticket_status.py
└── frontend/
    ├── app/
    │   ├── login/page.tsx
    │   ├── register/page.tsx
    │   ├── tickets/page.tsx
    │   ├── tickets/new/page.tsx
    │   ├── tickets/[id]/page.tsx
    │   └── admin/users/page.tsx
    ├── components/            # TicketList, ChatPanel, TicketInfoPanel, StatusBadge
    ├── lib/                   # api.ts (fetch + refresh), auth.ts, ws.ts, types.ts
    └── hooks/                 # useAuth, useTicketSocket
```

Kunci desain sejak awal:
- `get_current_user` memvalidasi token dan memuat user + `business_id`.
- Semua query tiket/pesan lewat service yang selalu menerima `business_id` dari user login.
- Tiket di luar hak akses (bisnis lain / customer lain) -> 404, bukan 403.
- Mesin status di satu fungsi: `open -> in_progress -> resolved -> closed`, plus `resolved -> open` hanya oleh customer pemilik.
- WebSocket: validasi token dan akses tiket sebelum `accept()`; tolak dengan close code 1008. `ConnectionManager` per `ticket_id` untuk broadcast pesan dan perubahan status.

## 3. Urutan pengerjaan

### A. WAJIB (urut, jangan loncat)

**Hari 1**
- [ ] 0. Setup: repo, folder, git init, `.env.example`, FastAPI hello, Next.js init, Postgres via Docker, Alembic
- [ ] 1. Model + migrasi: `businesses`, `users`, `tickets`, `messages`; email unik; index `(business_id, status)`
- [ ] 2. Auth backend: `POST /auth/registerbusiness`, `/auth/login`, `/auth/refresh`, `GET /auth/me`, hash password

**Hari 2**
- [ ] 3. User management: `GET/POST /users` (Admin; buat Agent/Customer)
- [x] 4. Tiket backend: `POST /tickets` (+ pesan pertama), `GET /tickets?status=`, `GET /tickets/{id}`, `PATCH /tickets/{id}` (assign, status, reopen)
- [ ] 5. `GET /tickets/{id}/messages` + format error JSON 401/403/404/422
- [ ] 6. Tes isolasi (pytest): bisnis A tebak ID tiket B -> 404; customer lain -> 404

**Hari 3**
- [ ] 7. WebSocket `/ws/tickets/{id}?token=`: simpan pesan, broadcast pesan + status, tolak koneksi tidak sah, `closed` tolak pesan
- [ ] 8. Seed script: 2 bisnis x (1 Admin, 1 Agent, 2 Customer)

**Hari 4**
- [ ] 9. Frontend auth: `/login`, `/register`, simpan token, auto-refresh, redirect ke `/login`
- [ ] 10. Frontend tiket: `/tickets` (filter status), `/tickets/new`
- [ ] 11. Frontend chat: `/tickets/[id]` (chat real-time + panel info + tombol aksi sesuai peran)
- [ ] 12. Frontend admin: `/admin/users`
- [ ] 13. Loading/error state + responsif HP (375px)

**Hari 5**
- [ ] 14. README (cara run, env var, akun demo) + bagian Catatan (keputusan, trade-off, yang belum selesai)
- [ ] 15. Video demo 3–5 menit: Customer + Agent di 2 browser, ubah status, bisnis A gagal buka tiket bisnis B
- [ ] 16. Audit akhir (checklist di bawah), kirim link repo

### B. BONUS (hanya jika semua wajib selesai; urut prioritas)

- [ ] 1. Docker Compose (frontend + backend + db satu perintah)
- [ ] 2. pytest lebih lengkap (status, auth)
- [ ] 3. Rate limiting login (`slowapi`)
- [ ] 4. Pagination + pencarian tiket
- [ ] 5. Badge pesan belum dibaca
- [ ] 6. Notifikasi real-time di daftar tiket
- [ ] 7. Indikator mengetik + status dibaca
- [ ] 8. Upload lampiran gambar
- [ ] 9. Deploy online (Vercel + Render/Railway)

## 4. Checklist audit akhir (tanda bahaya = otomatis gagal)

- [ ] Bisnis A `GET /tickets/{id_bisnis_B}` -> 404
- [ ] Customer 1 buka tiket customer 2 (bisnis sama) -> 404
- [ ] WebSocket tanpa token / ke tiket bukan hak -> ditolak
- [ ] Tidak ada `password` / `password_hash` di response mana pun
- [ ] Tidak ada secret ter-commit (`.env` di-gitignore, cek `git log -p`)
- [ ] Bisa menjelaskan setiap file, terutama auth, filter tenant, WebSocket
- [ ] Reviewer bisa menjalankan dari README dalam 15 menit
- [ ] Akun demo seed tercantum di README
- [ ] Riwayat commit wajar (bukan satu commit besar)

## 5. Tips

- Hari 1–2 penentu: auth dan isolasi benar = sebagian besar nilai fitur + keamanan aman.
- Rekam video di akhir hari 4 supaya ada ruang memperbaiki bug.
- Kalau mepet: wajib lengkap + README jujur lebih baik daripada bonus setengah jadi.
- Baca ulang kode AI setelah dihasilkan; ada sesi review live.
