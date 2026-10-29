# Keamanan dan kontrol akses

Status: threat model Fase 0 dan baseline Fase 1. Kontrol autentikasi/otorisasi admin serta form bisnis **belum** diimplementasikan; tidak ada klaim keamanan mutlak.

## Baseline Fase 1 yang sudah ada

- Validasi environment startup dan larangan Swagger pada production; CORS origin eksplisit; `TRUST_PROXY_HOPS` numerik, bukan percaya semua proxy.
- Helmet headers, batas body JSON/urlencoded, respons error generik, request ID acak, dan log JSON berisi method, pola route, status, durasi, serta kategori error. Body, query string, cookie, token, dan password tidak dicatat.
- Pool MySQL dengan timeout/readiness dan cleanup. SQL migrasi berversi, FK/constraint/indeks disiapkan; verifikasi di database nyata dilaporkan terpisah.
- `npm audit --omit=dev` menemukan **0** kerentanan. Audit seluruh lockfile menemukan 4 advisory **moderate** melalui `drizzle-kit` → `@esbuild-kit/esm-loader` → `esbuild` lama, semuanya dependency development. `npm audit fix --force` menyarankan downgrade Drizzle Kit yang memutus jalur migrasi, sehingga tidak diterapkan. CLI migrasi hanya dijalankan lokal/CI dan tidak diekspos sebagai layanan web; temuan tetap risiko terbuka sampai tersedia perbaikan yang kompatibel.

## Batas kepercayaan dan aset

Browser publik dan admin adalah klien tidak tepercaya. Reverse proxy, NestJS, MySQL, dan storage media adalah komponen server dengan hak akses terpisah. Aset utama: identitas/kontak pemustaka, uraian permohonan, kredensial admin, sesi, konten resmi, jejak status/audit, file panduan, dan backup. API publik tidak boleh mengungkap permohonan; admin hanya menerima data sesuai izin.

## Matriks role dan izin

`✓` berarti izin diberikan. Pemeriksaan dijalankan di server pada **setiap** endpoint admin, termasuk baca daftar/detail dan perubahan status. Navigasi frontend mengikuti izin yang dikembalikan backend, tetapi tidak menjadi kontrol keamanan. SUPERADMIN tetap melewati autentikasi dan audit.

| Izin | SUPERADMIN | ADMIN |
| --- | :---: | :---: |
| `content.read`, `content.manage` | ✓ | — |
| `navigation.read`, `navigation.manage` | ✓ | — |
| `resources.read`, `resources.manage` | ✓ | — |
| `slides.read`, `slides.manage` | ✓ | — |
| `media.read`, `media.manage` | ✓ | — |
| `requests.summary.read` | ✓ | ✓ |
| `requests.literacy.read`, `requests.literacy.status` | ✓ | ✓ |
| `requests.clearance.read`, `requests.clearance.status` | ✓ | ✓ |
| `settings.read`, `settings.manage` (kontak admin) | ✓ | — |
| `study_programs.read`, `study_programs.manage` | ✓ | — |
| `users.read`, `users.manage` | ✓ | — |
| `audit.read` | ✓ | — |
| `admin.me`, `auth.logout` (akun sendiri) | ✓ | ✓ |

`auth.login` hanya untuk akun admin aktif yang valid; `auth/csrf` hanya pada origin admin. Tidak ada endpoint registrasi. Pengelolaan pengguna tidak boleh membiarkan penghapusan/nonaktif superadmin aktif terakhir, promosi role tanpa izin `users.manage`, atau perubahan kredensial tanpa audit. Role/izin adalah allowlist di kode dan diuji; mengubah matriks memerlukan keputusan produk.

Rencana pengujian setiap modul baru: SUPERADMIN dapat mengakses seluruh route sesuai izin; ADMIN hanya route ringkasan/daftar/detail/status dua permohonan; ADMIN menerima 403 pada route konten, menu, media, pengaturan, akun, dan audit; anonim menerima 401; manipulasi URL, ID, method, atau body tidak melewati guard; perubahan status menghasilkan riwayat dan audit pada satu transaksi. Route modul yang belum diimplementasikan belum dapat dinyatakan lulus.

## Threat model

| Ancaman | Dampak | Mitigasi dan bukti yang harus diuji |
| --- | --- | --- |
| Brute force / credential stuffing admin | Pengambilalihan akun | Argon2id, rate limit login per IP pada satu proses dengan respons generik, pencatatan gagal login tanpa sandi, monitoring, sesi tidak berlaku saat akun dinonaktifkan; uji burst dan lockout yang tidak mudah disalahgunakan. Sebelum deployment multi-instance, pindahkan limiter ke penyimpanan bersama. |
| Pencurian/fiksasi sesi, CSRF | Aksi admin tanpa izin | Token sesi acak opaque, hash di DB, rotasi saat login, idle/absolute expiry, cookie `__Host-`, `Secure`, `HttpOnly`, `SameSite=Lax`, tanpa `Domain`; CSRF token dan pemeriksaan Origin/Fetch Metadata untuk semua mutasi termasuk login; uji cross-origin dan logout. |
| IDOR/BOLA pada ID permohonan | Kebocoran PII / perubahan status | Session + permission guard sebelum query, proyeksi DTO sesuai izin, tidak ada detail publik; uji anonim dan ID lain untuk list/detail/PATCH. |
| SQL injection dan pencarian liar | Baca/ubah data, beban DB | Query terparameterisasi Drizzle, allowlist sort/filter, panjang `q` dan pagination terbatas; uji input metacharacter dan beban. |
| Stored/reflected XSS melalui konten, judul, tautan | Pembajakan admin/pengunjung | Validasi dan sanitasi HTML terbit, escaping di React, CSP sesuai aset, URL hanya path internal/HTTPS yang diizinkan, `rel=noopener noreferrer` untuk tautan eksternal; uji payload HTML/URL. |
| Spam/bot pada formulir publik | DB penuh, gangguan layanan | Rate limit bertingkat IP/rute, batas body, honeypot dan pemeriksaan waktu yang proporsional, monitoring, tantangan tambahan hanya bila perlu; uji pengiriman berulang dan shared-network agar tidak memblokir sah secara berlebihan. |
| Unggah berbahaya / file berukuran besar | Eksekusi, XSS, storage habis | Admin saja, allowlist MIME dan ekstensi, verifikasi signature, batas ukuran, nama storage acak, file di luar webroot, scanning bila infrastruktur mendukung, header unduhan aman; uji file palsu/besar. |
| Tautan eksternal jahat / SSRF | Phishing atau akses internal | Validasi HTTPS dan host/path saat penyimpanan; server tidak mengambil URL admin secara otomatis; bila fetch kelak diperlukan, egress allowlist. |
| Race condition perubahan status | Riwayat/audit tidak cocok | Lock baris dan transaksi tunggal status + history + audit; uji dua PATCH serentak, rollback saat salah satu write gagal. |
| Log, backup, cache membocorkan PII | Ekspos data pemustaka | Redaksi log, `no-store` admin/form, backup terenkripsi dengan akses terbatas, restore test, retensi sesuai kebijakan; uji respons/header/log dan restore pada data uji. |
| Salah konfigurasi domain/CORS/TLS/secrets | Akses lintas origin atau kredensial bocor | Reverse proxy same-origin admin, CORS allowlist ketat jika diperlukan, HTTPS/HSTS setelah verifikasi, security headers, secrets di environment/manager, validasi konfigurasi startup; uji staging sesuai topologi. |

## Checklist implementasi dan verifikasi

Daftar berikut adalah gerbang keamanan lintas fase menuju produksi. Kontrol baseline Fase 1 di atas sudah diuji, tetapi item yang memerlukan autentikasi, formulir, penyimpanan media, atau deployment tetap terbuka.

- [ ] Pin dependensi yang didukung; jalankan dependency audit dan tindak lanjuti temuan sebelum rilis.
- [ ] Argon2id dengan parameter yang diuji pada hardware target; bootstrap superadmin satu kali dari kanal operator yang aman, tanpa sandi default atau output secret.
- [ ] Sesi server-side memakai token acak kuat dan hash token tersimpan; revoke logout/nonaktif pengguna; izin diperiksa per rute.
- [ ] CSRF untuk mutasi ber-cookie; CORS allowlist dan Origin check sesuai origin produksi; cookie dan header diuji di browser.
- [ ] DTO validasi/normalisasi, batas ukuran body, pagination, rate limit login dan formulir, perlindungan spam yang terukur.
- [ ] Query terparameterisasi, sanitasi konten, validasi URL, CSP/security headers, validasi dan pembatasan upload.
- [ ] Semua akses PII hanya melalui izin yang tepat; `no-store`; tidak ada data pribadi dalam log/error/analytics yang tidak diperlukan.
- [ ] Audit login, perubahan konten penting, pengaturan, pengguna, dan status; transaksi status/history/audit atomik; jejak audit terlindung dari edit biasa.
- [ ] Backup terenkripsi, prosedur recovery dan uji restore, monitoring, dan respons insiden sebelum produksi.
- [ ] Pisahkan akun migrasi berizin DDL dari akun runtime dengan hak minimum di produksi; batasi akses MySQL ke jaringan internal.
- [ ] Unit/integration/E2E untuk otorisasi, CSRF, input, workflow, serta pemeriksaan keamanan manual pada staging.
- [ ] Institusi menentukan retensi permohonan, audit, dan backup; mekanisme penghapusan/anonimisasi mengikuti keputusan tersebut.

Rujukan teknis: [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/), [NestJS authentication](https://docs.nestjs.com/security/authentication), [NestJS CSRF](https://docs.nestjs.com/security/csrf). Parameter dan API framework diverifikasi ulang pada versi yang dikunci di Fase 1.
