import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const requireBackend = createRequire(join(root, 'backend/package.json'));
requireBackend('dotenv').config({ path: join(root, '.env'), quiet: true });
const mysql = requireBackend('mysql2/promise');
const menu = [
  ['Beranda','/',[]], ['Profil','/profil',[['Profil Perpustakaan','/profil'],['Visi & Misi','/profil/visi-misi'],['Struktur Organisasi','/profil/struktur-organisasi'],['Profil Staf','/profil/staf']]],
  ['Berita','/berita',[]], ['Repositori','/repositori',[['Repository ITH','/repositori/repository-ith'],['Indonesia OneSearch','/repositori/indonesia-onesearch']]],
  ['E-Journal','/e-journal',[]], ['E-Book','/e-book',[]], ['Layanan','/layanan',[['Penelitian','/layanan/penelitian'],['Literasi Informasi','/layanan/literasi-informasi'],['Bebas Pustaka','/layanan/bebas-pustaka']]],
  ['Panduan','/panduan',[['Panduan Repo','/panduan/repo'],['Unggah / Unduh Panduan','/panduan/unggah-unduh'],['Panduan Lainnya','/panduan/lainnya']]],
];
const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD });
try {
  await connection.beginTransaction();
  const [rows] = await connection.execute('SELECT id FROM menu_items LIMIT 1 FOR UPDATE');
  if (rows.length) { await connection.rollback(); process.stdout.write('Menu sudah tersedia; seed dilewati.\n'); }
  else {
    for (const [position, [label, url, children]] of menu.entries()) {
      const [result] = await connection.execute('INSERT INTO menu_items (label, target_url, position, is_active) VALUES (?, ?, ?, 1)', [label, url, position]);
      for (const [childPosition, [childLabel, childUrl]] of children.entries()) await connection.execute('INSERT INTO menu_items (parent_id, label, target_url, position, is_active) VALUES (?, ?, ?, ?, 1)', [result.insertId, childLabel, childUrl, childPosition]);
    }
    await connection.commit();
    process.stdout.write('Delapan menu utama dan submenu contoh ditambahkan.\n');
  }
} catch (error) { await connection.rollback(); process.stderr.write('Seed menu gagal; periksa koneksi dan skema database.\n'); process.exitCode = 1; }
finally { await connection.end(); }
