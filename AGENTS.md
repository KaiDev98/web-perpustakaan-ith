# Petunjuk kerja untuk agen

## Ruang lingkup dan sumber keputusan

- Baca `CODEX_START_HERE.md` dan seluruh dokumen `docs/` sebelum mengubah desain.
- Pengguna menyetujui Fase 1 pada 29 Oktober 2026. Ruang lingkup saat ini hanya fondasi **backend** dan database; jangan membuat frontend/dashboard atau memulai autentikasi penuh Fase 2.
- Gunakan `Niyato` untuk pengembangan. Jangan mengembangkan di `main`, melakukan force push, atau menghapus perubahan pengguna. Persetujuan commit/push hanya berlaku untuk hasil Fase 0; perubahan Fase 1 tetap tanpa commit/push sampai pengguna menyetujui laporan implementasi.
- Remote masih kosong saat audit 28 Oktober 2026. Persetujuan 29 Oktober 2026 mengizinkan baseline minimal `main` serta commit/push dokumen Fase 0 pada `Niyato`; verifikasi keadaan GitHub setelah push.
- Proyek `../jdih-audit` dan Git di direktori induk tidak terkait. Jangan mengubah, menyalin, atau mempublikasikan isinya.

## Batas produk

- Website ini menyediakan profil, berita, tautan sumber digital, panduan, layanan penelitian, formulir literasi informasi, formulir bebas pustaka, dan dashboard admin.
- Jangan menambahkan katalog fisik, inventaris, anggota, peminjaman, pengembalian, denda, akun pemustaka, atau penerbitan otomatis surat bebas pustaka.
- Status kedua permohonan hanya `PROSES` dan `SELESAI`. Backend menetapkan `PROSES` saat permohonan dibuat.
- Pada formulir literasi, nama, judul, dan deskripsi wajib. WhatsApp dan email pemustaka masing-masing opsional dan dapat sama-sama kosong; nilai kosong menjadi SQL `NULL`. Kontak admin adalah pengaturan situs, bukan kontak pemustaka.

## Standar implementasi kelak

- Pisahkan `backend/` (NestJS/TypeScript), `frontend/` (Next.js/JavaScript/CSS), `database/`, `docs/`, `scripts/`, dan `.github/`.
- Semua API memakai prefix `/api/v1`, DTO/validasi server, izin per endpoint admin, dan migrasi MySQL berversi yang ditinjau sebelum dijalankan. Simpan secrets di environment/secret manager; hanya contoh tanpa nilai rahasia boleh masuk Git.
- Data permohonan adalah data pribadi. Jangan tampilkan di endpoint publik, log aplikasi, pesan error, atau contoh dokumentasi dengan data nyata. Perubahan status, riwayat, dan audit harus satu transaksi.
- Jalankan pengujian yang relevan dan laporkan hanya verifikasi yang benar-benar dilakukan. Jangan klaim keamanan atau kesiapan produksi tanpa bukti.
