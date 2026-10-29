# Fondasi frontend Perpustakaan ITH

Next.js JavaScript/CSS pada dua origin lokal yang berbeda:

| Aplikasi | URL development | Host cookie |
| --- | --- | --- |
| Publik | `http://localhost:3000` | `localhost`; tanpa login |
| Admin | `http://127.0.0.1:3002` | `127.0.0.1`; cookie admin host-only |
| API NestJS | `http://127.0.0.1:3001` | Diakses admin melalui rewrite same-origin `/api/v1` |

Perbedaan **hostname** publik dan admin diperlukan karena cookie browser dibatasi menurut host, bukan port. Di produksi gunakan domain publik/admin yang benar-benar berbeda dan HTTPS. Domain pada dokumen proyek masih rancangan.

Jalankan `npm ci` dalam folder `frontend/`, kemudian `npm run dev:public` dan `npm run dev:admin` pada terminal terpisah. Backend dan MySQL harus aktif untuk login admin. `npm run build:public` serta `npm run build:admin` memeriksa hasil produksi. `API_INTERNAL_ORIGIN` dapat mengubah alamat NestJS yang dipakai rewrite admin dan fetch server-side; default `http://127.0.0.1:3001`.

Dashboard admin memeriksa sesi melalui `GET /api/v1/admin/me` pada server sebelum merender. Login menggunakan endpoint CSRF/login backend dan cookie HttpOnly. Menu dashboard yang belum memiliki API ditampilkan sebagai fondasi navigasi tanpa CRUD semu. Bootstrap dua akun dilakukan oleh operator dari backend; kredensial tidak disimpan di frontend.
