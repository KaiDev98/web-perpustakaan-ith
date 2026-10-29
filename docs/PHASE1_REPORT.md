# Laporan implementasi backend Fase 1

Tanggal laporan: 29 Oktober 2026 (Asia/Makassar). Status: **fondasi backend Fase 1 tervalidasi; pengguna telah mengizinkan commit/push**. PASS di bawah merujuk hanya pada acceptance fondasi backend Fase 1; autentikasi, endpoint bisnis, frontend, dan deployment belum termasuk.

## 1. Git Fase 0

`main` memiliki baseline README commit `d21f39a3dc54b77231bfae0d52387637fc49751e`. `Niyato` dibuat dari baseline itu dan memiliki commit dokumen Fase 0 `4a6cfdbb9d8bb7c5e10f0d87e2407480e20bfff9`. Keduanya dipush tanpa force dan diverifikasi melalui GitHub API: branch `main` hanya memuat README, sedangkan `Niyato` memuat README, `.gitignore`, AGENTS, CODEX_START_HERE, dan enam dokumen Fase 0. Working tree bersih sebelum pekerjaan Fase 1 dimulai.

## 2. Branch aktif dan HEAD

Branch lokal aktif saat validasi: `Niyato`. HEAD sebelum commit Fase 1 adalah `4a6cfdbb9d8bb7c5e10f0d87e2407480e20bfff9`. SHA commit Fase 1 dicatat pada laporan akhir setelah push terverifikasi.

## 3. Inventaris file Fase 1

Baru:

```text
.env.example
compose.yaml
backend/README.md
backend/drizzle.config.ts
backend/eslint.config.mjs
backend/nest-cli.json
backend/package.json
backend/package-lock.json
backend/tsconfig.json
backend/tsconfig.build.json
backend/tsconfig.test.json
backend/src/app.module.ts
backend/src/main.ts
backend/src/config/env.ts
backend/src/database/database.module.ts
backend/src/database/schema.ts
backend/src/health/health.controller.ts
backend/src/health/health.module.ts
backend/src/common/api-exception.filter.ts
backend/src/common/api-response.interceptor.ts
backend/src/common/request-logger.ts
backend/src/common/validation.pipe.ts
backend/test/env.spec.ts
backend/test/health.spec.ts
backend/test/http.spec.ts
backend/test/database.integration.spec.ts
database/migrations/0000_amusing_the_hood.sql
database/migrations/meta/_journal.json
database/migrations/meta/0000_snapshot.json
docs/PHASE1_REPORT.md
```

Berubah: `.gitignore`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API_CONTRACT.md`, `docs/SECURITY.md`, dan `docs/ROADMAP.md`. Tidak ada `frontend/` atau dashboard admin yang dibuat.

## 4. Versi aktual

| Komponen | Versi terpakai |
| --- | --- |
| Node.js lokal | 22.23.2 LTS |
| npm lokal | 10.9.8 |
| NestJS core/platform-express | 12.3.2 |
| NestJS config / swagger | 12.0.1 / 12.0.5 |
| TypeScript | 5.9.3 |
| Drizzle ORM / Kit | 0.45.4 / 0.31.11 |
| mysql2 | 3.24.6 |
| MySQL Server uji | 8.4.13 |
| ESLint / typescript-eslint | 10.13.0 / 8.72.1 |

Versi dependency lengkap dipin pada `backend/package.json` dan `backend/package-lock.json`.

## 5. Modul dan fondasi NestJS

`AppModule` menggabungkan `ConfigModule`, `DatabaseModule`, `HealthModule`. Konfigurasi environment divalidasi saat startup dengan pesan nama variabel tanpa nilainya. DatabaseModule menyediakan pool mysql2 dan Drizzle lewat dependency injection, timeout, query readiness, serta cleanup pada shutdown. Common utilities menyediakan ValidationPipe global, respons `{data}`, error `{error}`, request ID, dan log JSON tanpa body/query/cookie/token. `main.ts` mengaktifkan Helmet, CORS allowlist, batas body, proxy hop terbatas, prefix `/api/v1`, dan Swagger hanya di nonproduction bila diaktifkan. Tidak ada autentikasi atau endpoint bisnis semu.

## 6–7. Database dan migrasi

MySQL 8.4.13 portable resmi dijalankan lokal pada `127.0.0.1:13307` karena port 3307 ditempati proses MySQL lain. File program/data dan `.env` berada pada folder yang diabaikan Git. Database baru `ith_library_v1` dipastikan memiliki **0 tabel** sebelum migrasi. `npm run db:migrate` berhasil dan dijalankan ulang secara idempotent. Hasil `information_schema`: **13 tabel domain + 1 ledger migrasi, 11 foreign key, 24 indeks sekunder, 3 CHECK**, charset `utf8mb4`, collation `utf8mb4_0900_ai_ci`, zona waktu server `+00:00`, dua kontak literasi nullable, status dua permohonan default `PROSES`, NIM tidak unik, serta satu entri ledger migrasi.

Uji pertama pada `ith_library` sempat gagal setelah 6 FK karena dua nama FK otomatis berpanjang 66 dan 68 karakter (batas MySQL 64). Schema dan migrasi awal yang belum di-commit diperbaiki dengan nama FK pendek; database parsial **tidak dihapus** dan uji ulang dilakukan pada database baru `ith_library_v1`. Tidak ada `DROP TABLE`, `TRUNCATE TABLE`, atau `DELETE FROM` pada migrasi versi awal.

## 8. Endpoint aktif

| Endpoint | Hasil |
| --- | --- |
| `GET /api/v1/health` | `200 {"data":{"status":"ok"}}`; tidak bergantung pada DB |
| `GET /api/v1/ready` | `200 {"data":{"status":"ready"}}` saat MySQL tersedia; `503` dengan error generik saat koneksi gagal |

Smoke test proses `npm start` terhadap MySQL nyata memberi HTTP 200 untuk kedua endpoint dan header `X-Request-ID`. OpenAPI pada `/api-docs` nonproduction hanya mencantumkan kedua endpoint ini.

## 9. Hasil verifikasi

| Perintah / pemeriksaan | Hasil |
| --- | --- |
| `npm install` | PASS; lockfile dibuat |
| `npm run typecheck`, `npm run lint`, `npm run build` | PASS |
| `npm test` | PASS, 12/12 uji fondasi/HTTP |
| `npm run db:check` | PASS |
| `npm run db:migrate` pada DB kosong dan pengulangan | PASS setelah perbaikan FK; satu migrasi tercatat |
| `npm run test:db` | PASS, 3/3 uji MySQL nyata dan readiness hidup/gagal |
| Docker Compose runtime | DEFERRED atas keputusan pengguna; alternatif MySQL 8.4 lokal lulus |
| `npm audit --omit=dev` | PASS, 0 kerentanan |
| `npm audit` seluruh lockfile | 4 moderate pada dependency development Drizzle Kit/esbuild; risiko terbuka |
| `npm start` + HTTP smoke | PASS, kedua endpoint 200 |
| Git ignore / secret scan | PASS, `.env`, `.local`, `node_modules`, `dist`, `dist-test` diabaikan; 0 nilai secret lokal ditemukan di 37 berkas kandidat commit saat pemeriksaan |
| Tautan Markdown lokal | PASS, 0 tautan rusak saat pemeriksaan |

## 10. Security baseline

Helmet security headers, CORS origin eksplisit, proxy hop terbatasi, pembatasan body, validasi konfigurasi fail-fast, respons error tanpa rincian DB, logging JSON teredaksi, request ID, Swagger nonproduction, dan audit dependency telah diterapkan/diuji. Autentikasi, Argon2id, sesi, CSRF, permission guard, audit aktivitas admin, dan proteksi form publik adalah pekerjaan fase berikutnya, bukan klaim Fase 1.

## 11. Acceptance Fase 1

| No. | Kriteria | Status | Bukti |
| ---: | --- | --- | --- |
| 1 | Backend dapat diinstal dan dibuild | PASS | `npm install`, `npm run build` |
| 2 | TypeScript typecheck | PASS | `npm run typecheck` |
| 3 | Environment tervalidasi | PASS | Uji valid/invalid dan startup invalid |
| 4 | MySQL 8.4 terhubung | PASS | MySQL 8.4.13 portable, uji koneksi nyata |
| 5 | Migrasi berhasil | PASS | DB baru 0 tabel → migrasi berhasil, ledger 1 |
| 6 | Skema sesuai rancangan | PASS | Metadata 13 tabel, 11 FK, 24 indeks, 3 CHECK, nullable/default |
| 7 | `/health` benar | PASS | Uji HTTP dan smoke `npm start` |
| 8 | `/ready` membedakan DB sehat/tidak | PASS | Uji HTTP 200/503 dan koneksi MySQL nyata/gagal |
| 9 | Error handling/validation | PASS | Uji 400, 413, 404, 503, DTO ekstra/pendek |
| 10 | Test relevan | PASS | 12 uji fondasi + 3 uji database |
| 11 | Dokumentasi sesuai kode | PASS | README/setup/kontrak/skema/keamanan diperbarui, tautan lokal diperiksa |
| 12 | Tidak ada secrets di Git | PASS | `.env`/`.local` diabaikan, secret scan 0 sebelum staging |

## 12. Masalah dan risiko tersisa

- Docker Desktop/daemon tidak berjalan pada host ini. Alternatif native MySQL 8.4.13 berhasil; runtime Compose DEFERRED atas keputusan pengguna.
- Database `ith_library` dari percobaan pertama menyimpan skema parsial dan tidak dihapus. Gunakan `ith_library_v1` untuk hasil uji; jangan memakai database parsial tanpa rencana pemulihan.
- `npm audit` penuh memiliki 4 advisory moderate pada dependency development [esbuild](https://github.com/advisories/GHSA-67mh-4wv8-2f99). Audit production-only 0. Drizzle Kit tetap dipin karena `npm audit fix --force` akan mengganti versi secara tidak kompatibel; evaluasi pembaruan upstream sebelum rilis.
- Hosting, domain, penyimpanan media, retensi PII, kontak resmi, dan kredensial produksi belum diputuskan. Akun DB runtime dan migrasi perlu dipisah pada produksi.

## 13. Rekomendasi Fase 2

Keputusan terbaru pengguna mengizinkan pekerjaan lanjutan: batasi role ke SUPERADMIN dan ADMIN melalui forward migration setelah audit data, lalu bangun bootstrap dua akun, Argon2id, sesi opaque server-side, cookie aman, login/logout serta CSRF, role/permission guard, dan audit autentikasi. Setelah backend autentikasi teruji, mulai fondasi frontend publik dan admin pada origin terpisah. Commit/push tiap tahap hanya setelah validasi relevan lulus.
