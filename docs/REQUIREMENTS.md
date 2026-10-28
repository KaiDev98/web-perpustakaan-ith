# Kebutuhan produk

Status: rancangan Fase 0, 28 Oktober 2026. Sumber utama adalah master prompt pengguna V2. Dokumen ini membedakan kebutuhan yang disepakati dan keputusan implementasi yang masih terbuka.

## Tujuan dan batas

Website resmi informasi Perpustakaan ITH menyediakan profil, berita, sumber digital, e-journal, e-book, layanan penelitian, permohonan literasi informasi, permohonan bebas pustaka, panduan, dan dashboard administrasi. Referensi [Perpustakaan Unhas](https://library.unhas.ac.id/) digunakan untuk pola beranda yang menonjolkan informasi, berita, dan tautan layanan; desain, konten, dan identitas ITH harus orisinal.

Di luar lingkup: katalog buku fisik, inventaris, anggota, peminjaman, pengembalian, denda, akun/login pemustaka, dan penerbitan otomatis dokumen bebas pustaka. Integrasi data akademik, notifikasi otomatis, pelacakan permohonan publik, dan pembayaran tidak termasuk ruang lingkup yang disetujui.

## Navigasi publik

| Menu | Submenu / fungsi |
| --- | --- |
| Beranda | Informasi utama, slide, berita, tautan layanan |
| Profil | Profil Perpustakaan; Visi & Misi; Struktur Organisasi; Profil Staf |
| Berita | Daftar dan detail publikasi |
| Repositori | Repository ITH; Indonesia OneSearch |
| E-Journal | Tautan/konten dinamis melalui admin |
| E-Book | Tautan/konten dinamis melalui admin |
| Layanan | Penelitian; Literasi Informasi; Bebas Pustaka |
| Panduan | Panduan Repo; panduan yang diunggah/diunduh; panduan lain |

Admin yang berizin dapat mengelola menu/submenu, urutan, target tautan, status aktif, dan konten terkait. Tautan eksternal divalidasi dan ditandai jelas pada UI. Semua halaman publik hanya menampilkan konten terbit/aktif.

## Form Permohonan Literasi Informasi

| Field | Aturan |
| --- | --- |
| Nama Lengkap | wajib, teks nonkosong |
| Judul Permohonan | wajib, teks nonkosong |
| Deskripsi | wajib, teks nonkosong |
| Nomor WhatsApp Pemustaka | opsional; jika ada, format telepon/WhatsApp valid |
| Email Pemustaka | opsional; jika ada, format email valid |

Kedua kontak boleh kosong bersamaan. Input kosong/whitespace kontak dinormalisasi menjadi `NULL`, bukan string kosong. Frontend mengirim ke NestJS; backend memvalidasi, menyimpan ke MySQL dengan status `PROSES`, dan mengembalikan pesan sukses. Bila keduanya tidak ada, UI tetap menyatakan permohonan diterima dan menambahkan bahwa pustakawan mungkin tidak dapat menghubungi pengirim secara langsung. Di bawah formulir, tampilkan WhatsApp dan email **admin perpustakaan** dari `site_settings`, yang dapat diubah melalui dashboard; keduanya tidak disalin ke kolom kontak pemustaka.

Modul admin bernama **FORM PUSTAKAWAN**. Daftar minimal memuat Nama Pemustaka, Judul, Tanggal Permohonan, Status, Aksi. Admin yang berizin dapat melihat detail/deskripsi/kontak jika tersedia, mencari, memfilter status, mengubah status, dan melihat riwayat. Status hanya `PROSES` dan `SELESAI`.

## Form Permohonan Bebas Pustaka

Nama Lengkap, NIM, Program Studi, WhatsApp, dan Email semuanya wajib. NIM diperlakukan sebagai string, bukan angka atau primary key. Program studi dipilih dari master data admin yang aktif. Backend memvalidasi dan menyimpan status awal `PROSES`.

Modul admin bernama **DAFTAR PEMOHON**. Kolom: Nama, NIM, Prodi, No. WA, Email, Status, Aksi. Admin yang berizin dapat membuka detail, mencari, memfilter, mengubah status hanya antara `PROSES`/`SELESAI`, dan melihat riwayat. `SELESAI` berarti proses administratif selesai; tidak ada sertifikat atau surat otomatis.

## Admin dan kualitas

- Role awal `SUPERADMIN`, `ADMIN`, `EDITOR`, tanpa registrasi publik. Superadmin pertama dibuat melalui bootstrap operator terbatas.
- Seluruh endpoint admin mewajibkan autentikasi, pemeriksaan izin, validasi, penanganan error, dan audit untuk aksi penting. Data pribadi permohonan hanya untuk role dengan izin.
- Konten, menu, slide, media, sumber digital, pengaturan kontak, program studi, dan pengguna dikelola sesuai matriks izin pada `SECURITY.md`.
- Website responsif dan dapat digunakan dengan keyboard, label formulir jelas, fokus terlihat, pesan validasi mudah dipahami; uji aksesibilitas sebelum rilis.
- Data ditransfer melalui HTTPS di produksi. Server menerapkan rate limit, pembatasan unggah, perlindungan CSRF sesi admin, backup, dan retensi data yang disepakati institusi.

## Kriteria terima lintas fase

1. Permohonan literasi dengan kedua kontak kosong berhasil dan tersimpan sebagai dua SQL `NULL`; status `PROSES`; UI menampilkan pesan khusus kontak.
2. Kontak yang diisi tetapi tidak valid ditolak; nama/judul/deskripsi kosong ditolak. Klien tidak dapat menentukan status awal.
3. Permohonan bebas pustaka menolak field wajib kosong dan program studi tidak aktif/tidak dikenal; NIM berulang dapat mengajukan lagi.
4. Pengguna tanpa izin tidak dapat membaca daftar/detail permohonan atau mengubah status, termasuk melalui ID yang ditebak.
5. Tiap perubahan status yang berhasil memiliki satu riwayat dan satu audit log dalam transaksi yang sama; status tetap hanya dua nilai.
6. Publik hanya melihat sumber/konten aktif, dan tidak dapat membaca data pribadi dari API, log publik, atau cache bersama.
