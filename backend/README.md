# Fondasi backend Fase 1 dan autentikasi Fase 2A

NestJS/TypeScript strict, REST `/api/v1`, Drizzle ORM/mysql2, migrasi SQL berversi, dan MySQL 8.4 LTS. Endpoint health, readiness, autentikasi admin, `/admin/me`, dan reset password terbatas SUPERADMIN sudah aktif. Endpoint konten dan permohonan masih menunggu fase berikutnya.

## Versi yang dipakai

Node.js **22.23.2 LTS** untuk verifikasi lokal (minimum generator Nest 12 pada lini 22: 22.22.3); npm 10.9.8; NestJS 12.3.2; TypeScript 5.9.3; Drizzle ORM 0.45.4; Drizzle Kit 0.31.11; mysql2 3.24.6; MySQL target 8.4.13. Versi tepat dependency lain tersimpan dalam `package-lock.json`. Sumber: [Node.js releases](https://nodejs.org/en/about/previous-releases), [NestJS prerequisites](https://docs.nestjs.com/first-steps), [MySQL 8.4 releases](https://dev.mysql.com/doc/relnotes/mysql/8.4/en/).

## Setup lokal

1. Dari root proyek, salin `.env.example` menjadi `.env`. Ganti **kedua** placeholder password dengan nilai lokal yang kuat; jangan commit `.env`. Set `DB_HOST`, `DB_PORT`, `DB_NAME`, dan `DB_USER` sesuai DB Anda. `MYSQL_ROOT_PASSWORD` hanya dipakai Docker Compose.
2. Jalankan `docker compose up -d mysql` dari root proyek. Image dipin ke MySQL 8.4.13 dan hanya dipublikasikan pada `127.0.0.1:3307`. Volume `ith_mysql_data` mempertahankan data. Jangan gunakan `docker compose down -v` pada data yang ingin dipertahankan.
3. Dari `backend/`, jalankan `npm ci` (atau `npm install` saat membuat lockfile). Jalankan `npm run db:check`, lalu `npm run db:migrate` pada database yang memang ditujukan untuk proyek ini. **Tinjau** SQL di `database/migrations/` sebelum migrasi; perintah tidak memakai `drizzle-kit push`. Migrasi kedua membatasi role pada `SUPERADMIN` dan `ADMIN`; script preflight menghentikan migrasi jika akun dengan role lain masih ada agar tidak terjadi promosi hak otomatis.
4. Jalankan `npm run build` lalu `npm start`. Untuk pengembangan dengan rebuild otomatis, `npm run start:dev` tersedia.
5. Uji `GET http://127.0.0.1:3001/api/v1/health` (200) dan `GET http://127.0.0.1:3001/api/v1/ready` (200 jika DB siap, 503 jika tidak). Respons mengikuti `{ "data": ... }` atau `{ "error": ... }` dan mengandung header `X-Request-ID`.
6. Bila `ENABLE_SWAGGER=true` pada development/test, dokumentasi interaktif ada di `http://127.0.0.1:3001/api-docs`; di production konfigurasi ini ditolak saat startup.

Jika Docker tidak tersedia, gunakan **MySQL Server 8.4 LTS lokal** pada port yang Anda pilih. Buat database `ith_library` dengan charset `utf8mb4`/collation `utf8mb4_0900_ai_ci`, buat pengguna aplikasi terbatas pada database itu, dan berikan izin DDL untuk migrasi development. Isi `.env` sesuai host/port/user/password lokal; jalankan `npm run db:migrate` dan uji yang sama. Jangan mengganti target dengan SQLite atau MariaDB untuk menyatakan acceptance MySQL PASS.

Pada Windows, arsip ZIP resmi [MySQL 8.4.13](https://dev.mysql.com/downloads/mysql/8.4.html?os=3) dapat diekstrak ke folder lokal di luar Git. Ikuti [prosedur inisialisasi MySQL](https://dev.mysql.com/doc/refman/8.4/en/data-directory-initialization.html), jalankan server dengan `bind-address=127.0.0.1`, port lokal kosong, `character-set-server=utf8mb4`, `collation-server=utf8mb4_0900_ai_ci`, dan zona waktu `+00:00`. Atur password root segera dan buat akun aplikasi terpisah. Jangan meletakkan password di argument command line atau di Git. Pada host pengujian ini Docker tidak berjalan; MySQL portable 8.4.13 dijalankan di `.local/` pada port **13307** karena port 3307 dipakai proses MySQL lain. Database uji berhasil adalah `ith_library_v1`.

## Perintah verifikasi

```text
npm run typecheck
npm run lint
npm test
npm run build
npm run db:check
npm run db:migrate
npm run test:db
npm audit --omit=dev
npm audit
```

`npm test` menguji konfigurasi, startup invalid, health, readiness dengan DB stub sehat/tidak sehat, validation, error, headers, CORS, dan OpenAPI. `npm run test:db` memerlukan MySQL 8.4 dengan migrasi yang telah diterapkan; tidak boleh dilaporkan PASS bila koneksi gagal. Pengujian migrasi pada database kosong dilakukan dengan memastikan DB baru, menerapkan `db:migrate`, lalu menjalankan `test:db` dan memeriksa metadata MySQL. Jangan menjalankan migrasi pada database berisi data tanpa backup dan review SQL.

## Environment

| Variabel | Tujuan |
| --- | --- |
| `NODE_ENV`, `PORT` | Mode dan port API; server development bind ke `127.0.0.1` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Koneksi MySQL aplikasi dan Drizzle Kit; password wajib dan placeholder ditolak |
| `MYSQL_ROOT_PASSWORD` | Bootstrap container MySQL lokal, tidak digunakan aplikasi |
| `DB_POOL_LIMIT`, `DB_CONNECT_TIMEOUT_MS`, `DB_READY_TIMEOUT_MS` | Pool, timeout koneksi, timeout query readiness |
| `BODY_LIMIT_BYTES` | Batas body JSON/urlencoded (default 65.536 byte) |
| `CORS_ORIGINS` | Daftar origin eksplisit dipisah koma; production hanya HTTPS, `*` ditolak |
| `TRUST_PROXY_HOPS` | Jumlah hop proxy yang dipercaya, 0–3; gunakan 0 bila backend diakses langsung |
| `ENABLE_SWAGGER` | `true` hanya di development/test, wajib `false` di production |
| `ADMIN_ORIGIN` | Origin admin tepat satu; development `http://127.0.0.1:3002`, production HTTPS |

## Bootstrap dua akun admin

Setelah migrasi, operator memberikan `BOOTSTRAP_SUPERADMIN_EMAIL`, `BOOTSTRAP_SUPERADMIN_NAME`, `BOOTSTRAP_SUPERADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, dan `BOOTSTRAP_ADMIN_PASSWORD` melalui environment sementara pada terminal yang aman, kemudian menjalankan `npm run admin:bootstrap`. Password minimum 16 karakter; tidak ada default atau nilai di repo. Script melewati akun role yang sudah ada tanpa mengubah sandinya, menolak email konflik, dan memakai transaksi. Jangan menyimpan variabel bootstrap pada `.env` atau history shell. Hapus variabel sementara setelah selesai.

Sesi admin memiliki idle expiry 30 menit dan absolute expiry 8 jam. Token mentah hanya dalam cookie HttpOnly (`Secure` dan prefix `__Host-` di production); MySQL hanya menyimpan SHA-256 token. Login, logout, dan reset password menggunakan token CSRF serta pemeriksaan Origin. Login dibatasi per IP pada proses tunggal; sebelum production perlu penyimpanan rate limit bersama jika backend dijalankan lebih dari satu instance.

## Troubleshooting

- `Invalid environment variables: ...`: periksa nama variabel yang disebut; log tidak menampilkan nilainya. Pastikan `.env` berada di root proyek dan password placeholder telah diganti.
- `/health` 200 tetapi `/ready` 503: proses hidup, tetapi koneksi/query MySQL gagal. Periksa daemon, port, database, akun, dan apakah migrasi telah diterapkan tanpa mencetak password.
- `docker info` tidak dapat menghubungi daemon: mulai Docker Desktop atau gunakan MySQL 8.4 lokal. CLI Docker terpasang tidak membuktikan daemon tersedia.
- Jika port 3307 sudah dipakai, pilih port loopback kosong (misalnya 13307), lalu ubah `DB_PORT` pada `.env`. Instance MySQL lokal lain jangan dihentikan atau ditimpa.
- Jika migrasi berhenti setelah sebagian DDL MySQL diterapkan, jangan jalankan ulang secara membabi buta pada database parsial. Audit `information_schema`, perbaiki SQL, lalu uji pada database baru; simpan database parsial untuk pemeriksaan sampai ada rencana pemulihan.
- `EACCES` pada HTTP loopback dalam sandbox: jalankan uji pada lingkungan yang mengizinkan bind/connect localhost; jangan menafsirkan kegagalan izin sandbox sebagai bug endpoint.
- `npm audit` dapat menemukan advisory pada dependency development Drizzle Kit; nilai dampak dan pembaruan yang aman sebelum deployment, tanpa `npm audit fix --force` yang mengganti versi mayor/merusak migrasi.
- Akun database development memerlukan izin DDL untuk migrasi. Sebelum produksi, pisahkan kredensial migrasi dari akun runtime dengan hak minimum dan simpan keduanya di secret manager.
