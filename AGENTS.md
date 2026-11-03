# AGENTS.md — HelpDesk Mini

Aplikasi ticketing multi-tenant. Backend FastAPI (Python 3.11+), frontend Next.js App Router + TypeScript + Tailwind. Satu user terikat ke satu bisnis dan satu peran (admin / agent / customer).

Spec lengkap: `docs/PLAN.md`. Jika ragu, tanya — jangan menebak.

---

## Perintah Dev

```bash
# Backend
cd backend
pip install -r requirements.txt
alembic upgrade head          # wajib sebelum jalankan server
uvicorn app.main:app --reload

pytest tests/                         # semua tes
pytest tests/test_isolation.py        # fokus isolasi tenant
pytest tests/test_isolation.py::nama_tes  # satu tes

# Frontend
cd frontend
npm install
npm run dev
npm run lint && npm run build         # verifikasi sebelum selesai
```

---

## Arsitektur

Lapisan: `routers/` → `services/` → `models/` (ORM).
- **Router**: HTTP/WS saja. Tidak boleh ada query SQL atau logika bisnis di sini.
- **Service**: semua logika bisnis + filter tenant. `business_id` selalu dari user login, bukan dari request body/path/query.
- **Model**: ORM SQLAlchemy. Skema hanya berubah lewat migrasi Alembic — jangan `create_all`, jangan edit tabel manual.

Titik masuk penting:
- `app/main.py` — FastAPI app, CORS, include routers
- `app/core/deps.py` — `get_current_user`: validasi token, muat user + `business_id`
- `app/services/ticket_service.py` — mesin status (satu-satunya tempat)
- `frontend/lib/api.ts` — semua panggilan API frontend (tidak ada `fetch` tersebar di komponen)
- `frontend/lib/types.ts` — semua tipe TypeScript

---

## Aturan Keamanan (TIDAK BOLEH DILANGGAR)

1. Semua query tiket/pesan WAJIB filter `business_id` dari token/DB — bukan dari input klien.
2. Akses ke data bisnis lain atau tiket customer lain → **404**, bukan 403 dan bukan datanya.
3. Cek peran di backend (dependency/service). UI saja tidak cukup.
4. Password hanya disimpan sebagai hash (`argon2-cffi`). Tidak ada `password` atau `password_hash` di response, schema output, atau log.
5. Jangan commit secret. Gunakan `.env` (di-gitignore) dan `.env.example` dengan nilai dummy.
6. WebSocket: validasi token dan hak akses tiket **sebelum** `accept()`. Tolak dengan close code **1008**.
7. Tiket `closed` menolak pesan baru. Hanya `resolved` yang boleh kembali ke `open`, dan hanya oleh customer pemilik tiket.

---

## Status Tiket

```
open → in_progress → resolved → closed
resolved → open   # hanya customer pemilik tiket
closed → *        # tidak ada transisi keluar
```

Mesin status ada di **satu tempat**: `app/services/ticket_service.py`. Jangan duplikasi di router atau frontend.

---

## Format Error

Semua error JSON: `{"detail": "...", "code": "..."}` dengan status 401 / 403 / 404 / 422 yang tepat.

---

## Kualitas Kode

- Python: type hints wajib, Pydantic untuk semua input/output, nama jelas, tanpa duplikasi besar.
- TypeScript: dilarang `any`; definisikan tipe di `frontend/lib/types.ts`.
- Setiap state UI punya penanganan loading dan error. Tampilan harus rapi di lebar **375px**.
- Fungsi kecil dan fokus. Tidak ada kode mati, tidak ada `print`/`console.log` sisa debug.

---

## Cara Kerja per Sesi

1. Kerjakan **satu tahap** dari `docs/PLAN.md` per sesi. Jangan loncat ke bonus sebelum semua wajib selesai.
2. Sebelum menulis kode: sebutkan file yang akan diubah dan alasannya.
3. Setelah menulis kode: jelaskan singkat apa yang dibuat — developer harus bisa menjelaskan setiap baris saat review live.
4. Setiap fitur backend baru: tambahkan minimal satu tes pytest, terutama untuk isolasi tenant.
5. Jalankan tes dan linter sebelum menyatakan selesai. Jangan klaim "sudah jalan" tanpa menjalankannya.
6. Jangan tambah dependency tanpa alasan; catat di README bagian Catatan.
7. Commit kecil dan sering: `feat(auth): add refresh endpoint`. Jangan satu commit besar.
8. Jika spesifikasi ambigu: pilih asumsi masuk akal, catat di README bagian Catatan.

---

## Dilarang

- Mengubah/menghapus tes agar lolos.
- Menonaktifkan pengecekan auth atau filter tenant "sementara".
- Menaruh credential asli di kode, contoh, atau dokumentasi.
- Menulis fitur bonus sebelum checklist wajib lengkap.
- Menambahkan kode yang tidak bisa dijelaskan baris per baris saat review live.
- `any` di TypeScript.
- `print` atau `console.log` sisa debug.
