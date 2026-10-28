# Roadmap dan gerbang keputusan

Fase berjalan berurutan. Keluaran Fase 0 adalah dokumen, bukan sistem siap pakai. Waktu/durasi ditetapkan setelah kapasitas tim, konten resmi, dan infrastruktur diketahui.

| Fase | Keluaran utama | Gerbang verifikasi sebelum lanjut |
| --- | --- | --- |
| **0 — Audit dan perencanaan** | Audit repository/starter, kebutuhan, arsitektur, ERD/skema, API contract, matriks izin, threat model, rencana ini | Pengguna menyetujui Fase 0 dan izin commit/push hasilnya pada 29 Oktober 2026. Verifikasi branch/file remote tetap wajib. |
| **1 — Fondasi backend** | `backend/` NestJS, konfigurasi environment, MySQL + Drizzle, migrasi awal berversi, `/api/v1/health`, `/api/v1/ready`, DTO validation, error handling, logging, OpenAPI dasar | Unit/integration untuk health, readiness sehat/tidak sehat, validasi, migrasi dari kosong; lint, typecheck, build, audit dependency. Tidak ada endpoint admin tanpa guard. |
| **2 — Autentikasi dan admin** | Bootstrap superadmin, login/logout, sesi, CSRF, role/permission guard, audit autentikasi | Uji izin tiap role, session expiry/revoke, login CSRF, brute force, cookie/header di browser. |
| **3 — Modul konten** | Profil, berita, slide, menu, sumber digital, repositori, panduan, pengaturan kontak dan media | Uji konten hanya terbit/aktif, sanitasi, URL, upload aman, dan permission per endpoint. |
| **4 — Modul layanan** | Form literasi dan bebas pustaka; FORM PUSTAKAWAN; DAFTAR PEMOHON; status/history/audit | Integration/E2E untuk kedua formulir, kontak literasi `NULL`, status awal, izin PII, transaksi/status serentak. |
| **5 — Frontend dan integrasi** | Website publik dan dashboard Next.js JavaScript/CSS, responsif, aksesibilitas, integrasi API | Uji browser, keyboard/screen reader, alur sukses/gagal, cache, CSRF, form tanpa akun pemustaka. |
| **6 — Deployment** | Domain/TLS, konfigurasi produksi, migrasi aman, backup, monitoring, runbook recovery | Uji staging, restore backup, pemeriksaan keamanan, review konfigurasi dan persetujuan rilis. |

## Urutan Fase 1 yang direkomendasikan

1. Kunci versi Node.js LTS, NestJS, Drizzle/mysql2, dan MySQL patch 8.4 LTS yang kompatibel berdasarkan dokumentasi saat implementasi; catat lockfile dan dukungan platform.
2. Buat struktur `backend/`, `frontend/`, `database/`, `scripts/`, `.github/` tanpa membawa kode atau secrets dari proyek JDIH.
3. Definisikan konfigurasi environment dengan fail-fast dan `.env.example` berisi placeholder saja; siapkan MySQL pengembangan terisolasi.
4. Implementasikan skema/migrasi awal dari `DATABASE.md`, review SQL dan constraint; uji penerapan pada DB kosong dan restore data uji.
5. Buat health endpoint, global validation/error filter, logging teredaksi, OpenAPI awal, dan CI untuk lint/build/test. Modul akun/permohonan mengikuti fase masing-masing.

## Keputusan terbuka

- Kontak admin resmi, daftar prodi, URL sumber digital, identitas visual dan teks profil/panduan/berita berwenang.
- Penyedia hosting, domain, media storage, backup, dan pemilik operasional. Contoh domain pada dokumen arsitektur belum berarti tersedia.
- Retensi data pribadi dan audit, pembatasan akses staf, serta prosedur permintaan penghapusan sesuai kebijakan ITH.
- Aturan format WhatsApp yang pasti (nomor Indonesia saja atau internasional), ukuran maksimum file, dan batas rate limit berdasarkan trafik nyata.
- Persetujuan commit/push saat ini hanya untuk Fase 0; perubahan Fase 1 disimpan lokal sampai laporan implementasi dievaluasi dan pengguna memberi persetujuan baru.
