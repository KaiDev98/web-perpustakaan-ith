# Kontrak REST API v1

Status: Fase 1 mengaktifkan `GET /health` dan `GET /ready`; Fase 2A mengaktifkan `GET /auth/csrf`, `POST /auth/login`, `POST /auth/logout`, `GET /admin/me`, dan `POST /admin/users/:id/password-reset`. Endpoint bisnis lainnya masih kontrak rencana. Base path `/api/v1`; JSON UTF-8 dan tanggal ISO 8601 UTC. Global ValidationPipe memakai `whitelist` + `forbidNonWhitelisted`; DTO bisnis baru dikerjakan pada fase terkait.

## Format umum

- Sukses: `{ "data": ... }`; daftar memakai `{ "data": [...], "meta": { "page": 1, "limit": 20, "total": 42 } }`. `limit` dibatasi server.
- Error: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`; `details` hanya ada untuk validasi DTO. Pesan tidak membocorkan SQL, stack trace, atau data pribadi.
- Tiap respons API aktif memuat header `X-Request-ID` (UUID acak server). Error 400 pada body JSON invalid, field DTO invalid/tambahan, dan 413 pada body melebihi batas. Untuk route yang belum ada, 404 aman tanpa mencerminkan URL/query pengguna.
- `400` input/validasi, `401` belum login, `403` tidak berizin/CSRF, `404` tidak ada, `409` konflik, `429` rate limit, `503` dependensi penting tidak siap, dan `500` kegagalan server. ID path harus integer positif dan tidak mengesampingkan pemeriksaan izin.
- Endpoint admin tidak boleh di-cache (`Cache-Control: no-store`). Respons publik hanya memuat field yang didaftarkan untuk publik. Tidak ada endpoint publik untuk daftar/detail permohonan.

## Publik

| Method & path | Respons / fungsi |
| --- | --- |
| `GET /health` **(aktif)** | `200 {"data":{"status":"ok"}}`, independen dari DB |
| `GET /ready` **(aktif)** | `200 {"data":{"status":"ready"}}` bila query DB berhasil; `503 {"error":{"code":"SERVICE_UNAVAILABLE","message":"Layanan belum siap."}}` bila gagal |
| `GET /public/navigation` | Menu/submenu aktif berurutan |
| `GET /public/settings` | Nama institusi, WhatsApp admin, email admin saja; tidak ada pengaturan rahasia |
| `GET /public/slides` | Slide aktif dan metadata media yang layak publik |
| `GET /public/contents` | Konten terbit; filter `type`, `slug`, `page`, `limit`; detail melalui `slug` |
| `GET /public/resources` | Tautan aktif; filter `type` (`REPOSITORY_ITH`, `INDONESIA_ONESEARCH`, `E_JOURNAL`, `E_BOOK`) |
| `GET /public/study-programs` | `id`, `code`, `name` program studi aktif untuk formulir bebas pustaka |
| `GET /public/media/:id` | Berkas yang telah terbit/dirujuk secara publik, dengan header aman; tidak membuka media privat |
| `POST /public/literacy-requests` | Validasi dan simpan permohonan literasi |
| `POST /public/clearance-requests` | Validasi dan simpan permohonan bebas pustaka |

### DTO `POST /public/literacy-requests`

```json
{
  "requester_name": "Nama Pemustaka",
  "title": "Judul permohonan",
  "description": "Uraian kebutuhan literasi",
  "requester_whatsapp": null,
  "requester_email": null
}
```

`requester_name`, `title`, dan `description`: string wajib, di-trim, tidak boleh kosong. Batas rancangan: 160, 255, dan 5000 karakter. `requester_whatsapp`/`requester_email`: field boleh tidak dikirim, `null`, atau string kosong/whitespace; setelah normalisasi kosong menjadi SQL `NULL`. Bila ada, email harus valid maksimal 254 karakter; WhatsApp menerima format nomor yang disepakati (nomor Indonesia `08...`/`+62...` atau E.164 internasional) lalu dinormalisasi dan diuji. Kedua field dapat sama-sama `NULL`. Body dengan `status` ditolak. Respons `201`:

```json
{
  "data": {
    "status": "PROSES",
    "message": "Permohonan berhasil diterima.",
    "contact_warning": true
  }
}
```

`contact_warning` bernilai `true` hanya ketika kedua kontak pemustaka tidak tersedia. Frontend menerjemahkan ini menjadi pemberitahuan bahwa pustakawan mungkin tidak dapat menghubungi pengirim secara langsung. Respons tidak mengulang PII.

### DTO `POST /public/clearance-requests`

```json
{
  "full_name": "Nama Pemohon",
  "nim": "1234567890",
  "study_program_id": 1,
  "whatsapp": "+6281234567890",
  "email": "pemohon@example.org"
}
```

Semua field wajib. Nama maksimal 160 karakter, NIM maksimal 32 karakter dan dipertahankan sebagai string, `study_program_id` harus ada dan aktif, WhatsApp/email valid. Body dengan `status` ditolak. Respons `201`: `{ "data": { "status": "PROSES", "message": "Permohonan berhasil diterima." } }`. Data program studi aktif diperlukan untuk dropdown; `GET /public/study-programs` mengembalikan `id`, `code`, `name` saja.

## Autentikasi admin

| Method & path | Aturan |
| --- | --- |
| `GET /auth/csrf` | Pada origin admin; menyiapkan token CSRF untuk login/aksi, `no-store` |
| `POST /auth/login` | `{ "email": "...", "password": "..." }`; rate limit dan respons gagal generik; set cookie sesi host-only |
| `POST /auth/logout` | Memerlukan sesi dan CSRF; cabut sesi, hapus cookie |
| `GET /admin/me` | Profil minimal pengguna login: `id`, `display_name`, `role`, daftar izin |
| `POST /admin/users/:id/password-reset` | Hanya SUPERADMIN, sesi + CSRF; sandi baru minimal 16 karakter, semua sesi target dicabut dan aksi diaudit |

Di production, cookie sesi `__Host-ith_admin` memakai `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, tanpa `Domain`; development lokal memakai `ith_admin` tanpa `Secure` pada HTTP loopback. Semua method mutasi admin, termasuk login, memerlukan token CSRF pada header `X-CSRF-Token` serta pemeriksaan `Origin`/Fetch Metadata. Token tidak masuk URL/log. Pengaturan detail implementasi diuji sebelum rilis.

## Admin permohonan

| Method & path | Izin | Fungsi |
| --- | --- | --- |
| `GET /admin/literacy-requests` | `requests.literacy.read` | Daftar FORM PUSTAKAWAN, `page`, `limit`, `status`, `q`; hasil memuat nama, judul, waktu, status, ID |
| `GET /admin/literacy-requests/:id` | `requests.literacy.read` | Detail, kontak pemustaka nullable, riwayat status |
| `PATCH /admin/literacy-requests/:id/status` | `requests.literacy.status` | Body `{ "status": "PROSES" }` atau `SELESAI`; transaksi status + riwayat + audit |
| `GET /admin/clearance-requests` | `requests.clearance.read` | Daftar DAFTAR PEMOHON, `page`, `limit`, `status`, `q` |
| `GET /admin/clearance-requests/:id` | `requests.clearance.read` | Detail dan riwayat |
| `PATCH /admin/clearance-requests/:id/status` | `requests.clearance.status` | Body status dua nilai; transaksi atomik |

Pencarian `q` dibatasi panjangnya dan memakai query terparameterisasi; tidak ada ekspor massal pada lingkup ini. Status yang sama mengembalikan status saat ini tanpa entri riwayat baru. Riwayat pada detail memuat status sebelumnya/baru, admin pengubah, dan waktu.

`SUPERADMIN` dan `ADMIN` sama-sama memiliki izin ringkasan permohonan, baca daftar/detail, serta perubahan status pada kedua modul. Setiap perubahan status harus mencatat riwayat dan audit secara atomik. Endpoint pada tabel ini masih kontrak rencana sampai controller/service terkait diterapkan.

## Admin konten dan konfigurasi

| Method & path | Izin | Fungsi |
| --- | --- | --- |
| `GET/POST /admin/contents`, `GET/PATCH/DELETE /admin/contents/:id` | `content.read` / `content.manage` | Profil, berita, layanan penelitian, panduan; DELETE hanya jika aman menurut relasi/kebijakan |
| `GET/POST /admin/navigation`, `PATCH/DELETE /admin/navigation/:id` | `navigation.read` / `navigation.manage` | Label, parent, urutan, target, aktif |
| `GET/POST /admin/resources`, `PATCH/DELETE /admin/resources/:id` | `resources.read` / `resources.manage` | Repositori, OneSearch, E-Journal, E-Book |
| `GET/POST /admin/slides`, `PATCH/DELETE /admin/slides/:id` | `slides.read` / `slides.manage` | Slide, urutan, status aktif |
| `GET/POST /admin/media`, `GET /admin/media/:id` | `media.read` / `media.manage` | Metadata/unggah panduan dan gambar; batas ukuran dan tipe |
| `GET/PATCH /admin/settings` | `settings.read` / `settings.manage` | Kontak admin dan identitas publik; hanya allowlist field |
| `GET/POST /admin/study-programs`, `PATCH /admin/study-programs/:id` | `study_programs.read` / `study_programs.manage` | Master data; nonaktifkan, jangan hapus jika dirujuk |
| `GET /admin/users`, `PATCH /admin/users/:id` | `users.read` / `users.manage` | Dua akun awal saja; pengaturan keamanan/kredensial khusus SUPERADMIN, tanpa endpoint penambahan akun |
| `GET /admin/audit-logs` | `audit.read` | Audit aman tanpa payload PII |

Semua `POST/PATCH/DELETE` admin membutuhkan CSRF dan audit aksi penting. Endpoint `DELETE` tidak boleh menghapus data historis permohonan atau jejak audit. Detail payload konten/menu/media ditetapkan sebagai DTO/OpenAPI pada fase modul terkait; izin dan batas data di atas adalah kontrak awal.

**Seluruh endpoint pada bagian konten dan konfigurasi hanya untuk `SUPERADMIN`.** `ADMIN` harus menerima HTTP 403 pada akses API langsung, termasuk melalui ID/URL yang dimodifikasi. Pengunjung tanpa sesi menerima HTTP 401. Navigasi frontend mengikuti daftar izin dari `GET /admin/me`.
