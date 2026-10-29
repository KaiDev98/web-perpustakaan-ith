import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import argon2 from 'argon2';

dotenv.config({ path: '../.env', quiet: true });
const accounts = [
  { role: 'SUPERADMIN', prefix: 'BOOTSTRAP_SUPERADMIN' },
  { role: 'ADMIN', prefix: 'BOOTSTRAP_ADMIN' },
];
async function main() {
if (process.env.BOOTSTRAP_ONLY && process.env.BOOTSTRAP_ONLY !== 'SUPERADMIN') {
  process.stderr.write('Invalid BOOTSTRAP_ONLY selection.\n');
  process.exitCode = 1;
  return;
}
const selectedAccounts = process.env.BOOTSTRAP_ONLY === 'SUPERADMIN' ? accounts.slice(0, 1) : accounts;
const connection = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_NAME,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, connectTimeout: 5000,
});
try {
  await connection.beginTransaction();
  for (const account of selectedAccounts) {
    const [existing] = await connection.execute('SELECT id FROM users WHERE role = ? LIMIT 1 FOR UPDATE', [account.role]);
    if (existing.length) {
      process.stdout.write(`${account.role}: already exists; unchanged.\n`);
      continue;
    }
    const email = process.env[`${account.prefix}_EMAIL`]?.trim().toLowerCase();
    const name = process.env[`${account.prefix}_NAME`]?.trim();
    const password = process.env[`${account.prefix}_PASSWORD`];
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length > 160 || !password || password.length < 16) {
      throw new Error(`${account.role}: operator must provide valid EMAIL, NAME, and PASSWORD (16+ characters) through temporary environment variables.`);
    }
    const [sameEmail] = await connection.execute('SELECT id FROM users WHERE email = ? LIMIT 1 FOR UPDATE', [email]);
    if (sameEmail.length) throw new Error(`${account.role}: email already belongs to another account.`);
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    await connection.execute(
      'INSERT INTO users (email, display_name, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))',
      [email, name, hash, account.role],
    );
    process.stdout.write(`${account.role}: created.\n`);
  }
  await connection.commit();
} catch (error) {
  await connection.rollback();
  const message = error instanceof Error && /^(SUPERADMIN|ADMIN):/.test(error.message)
    ? error.message : 'Bootstrap failed. Check operator input and database state.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
} finally {
  await connection.end();
}
}
main().catch(() => {
  process.stderr.write('Bootstrap failed before transaction. Check database configuration.\n');
  process.exitCode = 1;
});
