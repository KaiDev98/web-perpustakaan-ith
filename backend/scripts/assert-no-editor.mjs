import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: '../.env', quiet: true });
const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USER || !DB_PASSWORD) {
  throw new Error('Database environment is incomplete.');
}

const connection = await mysql.createConnection({
  host: DB_HOST, port: Number(DB_PORT), database: DB_NAME,
  user: DB_USER, password: DB_PASSWORD, connectTimeout: 5000,
});
try {
  const [tables] = await connection.execute(
    "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = ? AND table_name = 'users'",
    [DB_NAME],
  );
  if (Number(tables[0].total) > 0) {
    const [roles] = await connection.execute("SELECT COUNT(*) AS total FROM users WHERE role = 'EDITOR'");
    if (Number(roles[0].total) > 0) {
      throw new Error('Migration stopped: EDITOR accounts exist. Review and resolve them manually; no automatic role promotion.');
    }
  }
  process.stdout.write('Role migration preflight passed.\n');
} finally {
  await connection.end();
}
