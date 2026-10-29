# Mulai di sini

## Status audit 28 Oktober 2026

1. Repository tujuan: `https://github.com/KaiDev98/web-perpustakaan-ith.git`. GitHub API mengembalikan repository publik `size: 0`, daftar branch `[]`, dan pesan `This repository is empty` untuk root contents.
2. Direktori kerja induk `KP` adalah repository Git lain yang belum memiliki commit (`master`) dan memuat `jdih-audit/` sebagai berkas tidak terlacak. Itu bukan starter Perpustakaan ITH; jangan sentuh.
3. Folder `web-perpustakaan-ith/` dibuat sebagai repository Git lokal tersendiri dengan remote `origin` yang benar. HEAD lokal menunjuk ke `Niyato`, tetapi branch tersebut belum memiliki commit. `main` dan `Niyato` belum tersedia di GitHub.
4. Tidak ada starter backend Perpustakaan ITH yang ditemukan pada target kosong. `../jdih-audit/README.md` menyebut **Portal JDIH ITH Parepare** dan `../jdih-audit/backend/package.json` bernama `@jdih/api`; jadi backend itu milik produk berbeda. Berkas konfigurasi/secrets lokalnya tidak dibuka atau disalin.
5. Larangan commit/push menghalangi pembuatan baseline `main` dan branch `Niyato` yang benar-benar berbasis commit `main`. Jangan memaksa atau menyembunyikan keadaan ini.

## Persetujuan 29 Oktober 2026

Pengguna telah menyetujui commit/push Fase 0 dan Fase 1; keduanya sudah ada di remote. Branch `Niyato` adalah branch pengembangan wajib. Keputusan terbaru: publik tanpa login, admin pada origin terpisah, hanya role `SUPERADMIN` dan `ADMIN`, dua akun awal lewat bootstrap CLI. Pengguna menyetujui commit/push checkpoint Fase 2A/2B setelah pemeriksaan akhir. Perubahan Fase 3 tetap lokal sampai persetujuan terpisah. Bagian audit di atas adalah catatan historis. Jangan force push atau merge ke `main`.

Revisi izin terbaru membatasi `ADMIN` pada ringkasan dan pemrosesan dua jenis permohonan. Seluruh pengelolaan konten/website, akun, dan audit log khusus `SUPERADMIN`. Revisi ini termasuk dalam checkpoint Fase 2A/2B yang disetujui pengguna.

## Peta dokumen

| Dokumen | Isi |
| --- | --- |
| `docs/REQUIREMENTS.md` | Lingkup, menu, formulir, aturan bisnis, kriteria terima |
| `docs/ARCHITECTURE.md` | Komponen, aliran data, pilihan teknologi, batas kepercayaan |
| `docs/DATABASE.md` | ERD, tabel, kolom, relasi, indeks, strategi migrasi |
| `docs/API_CONTRACT.md` | Endpoint, DTO, respons, validasi, otorisasi |
| `docs/SECURITY.md` | Matriks izin, threat model, kontrol, verifikasi |
| `docs/ROADMAP.md` | Fase, keluaran, dan gerbang lanjut |

## Keputusan aktif

- Backend NestJS/TypeScript; frontend Next.js/JavaScript/CSS; MySQL seri 8.4 LTS; REST `/api/v1`; Drizzle ORM + mysql2 dengan migrasi SQL berversi yang ditinjau.
- Sesi admin opaque di server dengan cookie host-only pada origin admin; API admin dilayani lewat reverse proxy pada origin yang sama. Argon2id untuk sandi. Tidak ada pendaftaran publik.
- Kontak admin hanya dari pengaturan situs. Kontak pemustaka literasi dapat keduanya `NULL`. Tidak ada akun pemustaka.
- Hanya dua status permohonan: `PROSES`, `SELESAI`. Semua transisi admin dicatat atomik dalam riwayat dan audit.

## Pertanyaan yang perlu diputuskan sebelum implementasi terkait

- Identitas visual ITH, naskah profil resmi, daftar staf, dan materi berita/panduan yang boleh dipublikasikan.
- Nilai WhatsApp/email admin resmi, daftar program studi awal, dan URL resmi Repository ITH/Indonesia OneSearch.
- Lokasi hosting, domain, penyimpanan media, kebijakan retensi data pribadi, petugas pemulihan backup, serta kapasitas anti-spam.
- Sebelum deployment: pastikan keputusan operasional dan konten resmi di atas telah diselesaikan. Jangan menganggap domain contoh sudah tersedia.

## Referensi yang diperiksa

- [Beranda Perpustakaan Unhas](https://library.unhas.ac.id/) sebagai inspirasi susunan informasi, berita, dan tautan sumber. Halaman langsung sempat timeout; hasil indeks halaman resmi dibaca. Jangan menyalin identitas/konten atau modul katalog/sirkulasi.
- [MySQL LTS](https://dev.mysql.com/doc/refman/8.4/en/mysql-releases.html), [Drizzle MySQL](https://orm.drizzle.team/docs/get-started/mysql-new), [Drizzle migration](https://orm.drizzle.team/docs/migrations), [NestJS authentication](https://docs.nestjs.com/security/authentication).
