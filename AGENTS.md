# Petunjuk kerja untuk agen

## Ruang lingkup dan sumber keputusan

- Baca `CODEX_START_HERE.md` dan seluruh dokumen `docs/` sebelum mengubah desain.
- Pada 29 Oktober 2026 pengguna menyetujui commit/push Fase 1 dan pekerjaan lanjutan: pembatasan role, autentikasi admin Fase 2A, lalu fondasi frontend Fase 2B. Keputusan terbaru pengguna mengesampingkan rencana fase yang lama.
- Gunakan `Niyato` untuk pengembangan. Jangan mengembangkan di `main`, melakukan force push, atau menghapus perubahan pengguna. Commit/push pekerjaan lanjutan diizinkan setelah pengujian relevan lulus.
- Remote masih kosong saat audit 28 Oktober 2026; catatan historis itu sudah tidak menggambarkan kondisi sekarang. Verifikasi keadaan GitHub setelah push.
- Proyek `../jdih-audit` dan Git di direktori induk tidak terkait. Jangan mengubah, menyalin, atau mempublikasikan isinya.

## Batas produk

- Website ini menyediakan profil, berita, tautan sumber digital, panduan, layanan penelitian, formulir literasi informasi, formulir bebas pustaka, dan dashboard admin.
- Website publik tidak memerlukan login. Admin di origin terpisah; hanya dua role `SUPERADMIN` dan `ADMIN`, dengan dua akun awal dari bootstrap CLI. Tidak ada registrasi atau penambahan akun via web pada lingkup saat ini.
- Jangan menambahkan katalog fisik, inventaris, anggota, peminjaman, pengembalian, denda, akun pemustaka, atau penerbitan otomatis surat bebas pustaka.
- Status kedua permohonan hanya `PROSES` dan `SELESAI`. Backend menetapkan `PROSES` saat permohonan dibuat.
- Pada formulir literasi, nama, judul, dan deskripsi wajib. WhatsApp dan email pemustaka masing-masing opsional dan dapat sama-sama kosong; nilai kosong menjadi SQL `NULL`. Kontak admin adalah pengaturan situs, bukan kontak pemustaka.

## Standar implementasi kelak

- Pisahkan `backend/` (NestJS/TypeScript), `frontend/` (Next.js/JavaScript/CSS), `database/`, `docs/`, `scripts/`, dan `.github/`.
- Semua API memakai prefix `/api/v1`, DTO/validasi server, izin per endpoint admin, dan migrasi MySQL berversi yang ditinjau sebelum dijalankan. Simpan secrets di environment/secret manager; hanya contoh tanpa nilai rahasia boleh masuk Git.
- Data permohonan adalah data pribadi. Jangan tampilkan di endpoint publik, log aplikasi, pesan error, atau contoh dokumentasi dengan data nyata. Perubahan status, riwayat, dan audit harus satu transaksi.
- Jalankan pengujian yang relevan dan laporkan hanya verifikasi yang benar-benar dilakukan. Jangan klaim keamanan atau kesiapan produksi tanpa bukti.
