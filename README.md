# Website Perpustakaan ITH

Website informasi, akses sumber digital, dan layanan permohonan **Perpustakaan Institut Teknologi Bacharuddin Jusuf Habibie (ITH)**.

> **Status:** Dalam pengembangan. Backend CMS, frontend publik dan admin, kedua formulir layanan, serta preview dashboard telah diimplementasikan pada branch [`Niyato`](https://github.com/KaiDev98/web-perpustakaan-ith/tree/Niyato). **Belum siap digunakan di produksi.**

## Fitur Utama

### Website Publik

- **Beranda:** slider, berita, dan informasi perpustakaan.
- **Profil:** Profil Perpustakaan, Visi & Misi, Struktur Organisasi, dan Profil Staf.
- **Berita:** daftar dan detail berita yang diterbitkan.
- **Repositori:** tautan Repository ITH dan Indonesia OneSearch.
- **E-Journal dan E-Book:** daftar sumber digital yang dikelola dari CMS.
- **Layanan:** Penelitian, Literasi Informasi, dan Bebas Pustaka.
- **Panduan:** informasi dan berkas panduan perpustakaan.

### Layanan Permohonan

| Layanan | Field | Status |
| --- | --- | --- |
| Literasi Informasi | Nama, judul, deskripsi (wajib); WhatsApp dan email (opsional) | `PROSES` / `SELESAI` |
| Bebas Pustaka | Nama lengkap, NIM, program studi, WhatsApp, email (wajib) | `PROSES` / `SELESAI` |

Form publik terhubung ke REST API dan MySQL. Pengelola dapat mencari, memfilter, membuka detail, dan mengubah status permohonan. Riwayat perubahan status dan audit dicatat oleh backend.

### Dashboard Pengelola

| Role | Hak Akses |
| --- | --- |
| **SUPERADMIN** | Panel CMS (berita/konten, profil, navigasi, sumber digital, slider, media, panduan, pengaturan) dan pengelolaan permohonan. Backend juga menyediakan reset password admin dan mencatat audit; antarmuka daftar pengguna serta audit lengkap masih dalam pengembangan. |
| **ADMIN** | Ringkasan operasional serta daftar, detail, dan perubahan status permohonan Literasi Informasi dan Bebas Pustaka. |

Dashboard asli memerlukan login dan pemeriksaan hak akses oleh backend. Tidak tersedia pendaftaran akun admin melalui publik.

## Teknologi

| Komponen | Teknologi |
| --- | --- |
| Backend | NestJS, TypeScript, REST API `/api/v1` |
| Frontend | Next.js, JavaScript, CSS |
| Database | MySQL 8.4 LTS |
| Akses data | Drizzle ORM dan migrasi SQL berversi |
| Keamanan | Sesi admin, Argon2id, CSRF, permission guard, validasi input, audit log |

Backend dan frontend berada dalam folder terpisah.

## Menjalankan Secara Lokal

Siapkan Node.js yang sesuai dengan [`backend/package.json`](backend/package.json), npm, database MySQL 8.4, dan konfigurasi `.env` sebagaimana dijelaskan di [petunjuk backend](backend/README.md). **Tinjau migrasi sebelum menjalankannya pada database yang berisi data.**

### 1. Backend

Dari folder `backend/`:

```bash
npm ci
npm run db:check
npm run db:migrate
npm run cms:seed-navigation
npm run requests:seed-programs
npm run start:dev
```

### 2. Frontend Publik dan Admin

Dari folder `frontend/`, instal dependency lalu jalankan kedua aplikasi pada terminal terpisah:

```bash
npm ci
npm run dev:public
```

```bash
npm run dev:admin
```

| Layanan | URL lokal |
| --- | --- |
| Publik | http://localhost:3000 |
| Login admin | http://127.0.0.1:3002/login |
| Health API | http://127.0.0.1:3001/api/v1/health |

Alamat di atas hanya berlaku apabila server development sedang berjalan.

### 3. Bootstrap SUPERADMIN

Akun administrator permanen tidak disertakan dalam repository. Operator Windows dapat menjalankan skrip dari root repository:

```powershell
.\backend\scripts\bootstrap-superadmin.ps1
```

Skrip meminta identitas dan password secara interaktif, dengan input password tersembunyi. Jangan membagikan atau meng-commit kredensial.

### 4. Preview Dashboard — Development Only

Tombol pada halaman login dapat membuka mode simulasi tanpa akun, sesi admin, atau permohonan asli:

- [Preview ADMIN](http://127.0.0.1:3002/preview/admin)
- [Preview SUPERADMIN](http://127.0.0.1:3002/preview/superadmin)

Preview hanya tersedia dalam mode development ketika `ADMIN_PREVIEW_ENABLED=true`. Salin [`frontend/apps/admin/.env.example`](frontend/apps/admin/.env.example) ke `frontend/apps/admin/.env.local`, ubah nilainya menjadi `true`, lalu jalankan ulang server admin. Semua datanya sintetis dan perubahan tidak disimpan. Pada production route preview ditolak oleh server.

## Dokumentasi

- [Panduan Awal Codex](CODEX_START_HERE.md)
- [Kebutuhan Sistem](docs/REQUIREMENTS.md)
- [Arsitektur](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Kontrak API](docs/API_CONTRACT.md)
- [Keamanan](docs/SECURITY.md)
- [Roadmap](docs/ROADMAP.md)
- [Panduan Backend](backend/README.md)
- [Panduan Frontend](frontend/README.md)

## Status Pengembangan

Fitur utama CMS dan layanan permohonan telah dikembangkan dan dicoba secara lokal. Tahapan berikutnya mencakup pengisian informasi resmi ITH, penyiapan akun operator, penyempurnaan UI/UX, pengujian lebih luas, konfigurasi infrastruktur, dan hardening sebelum deployment.

**Cakupan proyek:** website informasi dan sumber digital, **bukan** katalog buku fisik, sistem keanggotaan, peminjaman, pengembalian, atau denda.

**Keamanan Git:** jangan commit `.env`, password, token, database lokal, data pribadi pemustaka, log, `node_modules`, maupun artefak build.

---

**Repository:** [KaiDev98/web-perpustakaan-ith](https://github.com/KaiDev98/web-perpustakaan-ith) · **Branch pengembangan:** [`Niyato`](https://github.com/KaiDev98/web-perpustakaan-ith/tree/Niyato)
