import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const requireBackend = createRequire(join(root, 'backend/package.json'));
requireBackend('dotenv').config({ path: join(root, '.env'), quiet: true });
const mysql = requireBackend('mysql2/promise');
// Names checked against ith.ac.id/academic/faculties/sains and /teknologi-produksi-dan-industri (October 2026).
const names = [
  'Matematika','Sistem Informasi','Sains Data','Sains Aktuaria','Bioteknologi','Bisnis Digital',
  'Ilmu Komputer','Teknologi Pangan','Teknik Sistem Energi','Teknik Metalurgi','Teknik Sipil','Teknik Perkapalan',
  'Teknik Robotika dan Kecerdasan Buatan','Arsitektur','Teknik Industri','Teknik Lingkungan','Teknik Mesin',
  'Teknik Elektro','Perencanaan Wilayah dan Kota',
];
const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD });
try {
  await connection.beginTransaction();
  const [existing] = await connection.execute('SELECT id FROM study_programs LIMIT 1 FOR UPDATE');
  if (existing.length) { await connection.rollback(); process.stdout.write('Program studi sudah tersedia; seed dilewati.\n'); }
  else {
    for (const [index, name] of names.entries()) await connection.execute('INSERT INTO study_programs (code, name, is_active) VALUES (?, ?, 1)', [`ITH-${String(index + 1).padStart(2, '0')}`, name]);
    await connection.commit(); process.stdout.write(`${names.length} program studi ditambahkan.\n`);
  }
} catch { await connection.rollback(); process.stderr.write('Seed program studi gagal; periksa koneksi dan skema.\n'); process.exitCode = 1; }
finally { await connection.end(); }
