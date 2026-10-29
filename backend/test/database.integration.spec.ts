import assert from 'node:assert/strict';
import test from 'node:test';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import { DatabaseService } from '../src/database/database.module.js';

dotenv.config({ path: '../.env', quiet: true });

test('MySQL 8.4 migration matches 13-table foundation', async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectTimeout: 5000,
    connectionLimit: 2,
  });
  try {
    const [versionRows] = await pool.query<Array<{ version: string }> & mysql.RowDataPacket[]>('SELECT VERSION() AS version');
    assert.match(versionRows[0]?.version ?? '', /^8\.4\./);
    const [tableRows] = await pool.query<Array<{ total: number }> & mysql.RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = ? AND table_type = ?',
      [process.env.DB_NAME, 'BASE TABLE'],
    );
    assert.equal(tableRows[0]?.total, 14); // 13 business tables + Drizzle migration ledger
    const [fkRows] = await pool.query<Array<{ total: number }> & mysql.RowDataPacket[]>(
      "SELECT COUNT(*) AS total FROM information_schema.table_constraints WHERE constraint_schema = ? AND constraint_type = 'FOREIGN KEY'",
      [process.env.DB_NAME],
    );
    assert.equal(fkRows[0]?.total, 11);
    const [indexRows] = await pool.query<Array<{ total: number }> & mysql.RowDataPacket[]>(
      "SELECT COUNT(DISTINCT CONCAT(table_name, '.', index_name)) AS total FROM information_schema.statistics WHERE table_schema = ? AND index_name <> 'PRIMARY' AND table_name <> '__drizzle_migrations'",
      [process.env.DB_NAME],
    );
    assert.ok((indexRows[0]?.total ?? 0) >= 23);
    const [importantIndexes] = await pool.query<Array<{ index_name: string }> & mysql.RowDataPacket[]>(
      "SELECT DISTINCT index_name AS index_name FROM information_schema.statistics WHERE table_schema = ? AND index_name <> 'PRIMARY'",
      [process.env.DB_NAME],
    );
    const indexNames = new Set(importantIndexes.map((row) => row.index_name));
    for (const name of ['users_email_uq', 'admin_sessions_token_hash_uq', 'literacy_status_created_idx',
      'clearance_status_created_idx', 'clearance_nim_idx', 'status_history_literacy_idx',
      'status_history_clearance_idx', 'audit_actor_time_idx', 'resources_type_active_idx']) {
      assert.ok(indexNames.has(name), `Missing index: ${name}`);
    }
    const [checkRows] = await pool.query<Array<{ total: number }> & mysql.RowDataPacket[]>(
      "SELECT COUNT(*) AS total FROM information_schema.table_constraints WHERE constraint_schema = ? AND constraint_type = 'CHECK'",
      [process.env.DB_NAME],
    );
    assert.equal(checkRows[0]?.total, 3);
    const [schemaRows] = await pool.query<Array<{ charset: string; collation: string }> & mysql.RowDataPacket[]>(
      'SELECT default_character_set_name AS charset, default_collation_name AS collation FROM information_schema.schemata WHERE schema_name = ?',
      [process.env.DB_NAME],
    );
    assert.equal(schemaRows[0]?.charset, 'utf8mb4');
    assert.equal(schemaRows[0]?.collation, 'utf8mb4_0900_ai_ci');
    const [timezoneRows] = await pool.query<Array<{ timezone: string }> & mysql.RowDataPacket[]>(
      'SELECT @@global.time_zone AS timezone',
    );
    assert.equal(timezoneRows[0]?.timezone, '+00:00');
    const [contactRows] = await pool.query<Array<{ column_name: string; is_nullable: string }> & mysql.RowDataPacket[]>(
      "SELECT column_name AS column_name, is_nullable AS is_nullable FROM information_schema.columns WHERE table_schema = ? AND table_name = 'literacy_requests' AND column_name IN ('requester_whatsapp','requester_email')",
      [process.env.DB_NAME],
    );
    assert.equal(contactRows.length, 2);
    assert.ok(contactRows.every((row) => row.is_nullable === 'YES'));
    const [statusRows] = await pool.query<Array<{ column_default: string }> & mysql.RowDataPacket[]>(
      "SELECT column_default AS column_default FROM information_schema.columns WHERE table_schema = ? AND table_name IN ('literacy_requests','clearance_requests') AND column_name = 'status'",
      [process.env.DB_NAME],
    );
    assert.equal(statusRows.length, 2);
    assert.ok(statusRows.every((row) => row.column_default === 'PROSES'));
    const [statusTypes] = await pool.query<Array<{ column_type: string }> & mysql.RowDataPacket[]>(
      "SELECT column_type AS column_type FROM information_schema.columns WHERE table_schema = ? AND table_name IN ('literacy_requests','clearance_requests') AND column_name = 'status'",
      [process.env.DB_NAME],
    );
    assert.ok(statusTypes.every((row) => row.column_type === "enum('PROSES','SELESAI')"));
    const [nimUnique] = await pool.query<Array<{ total: number }> & mysql.RowDataPacket[]>(
      "SELECT COUNT(*) AS total FROM information_schema.statistics WHERE table_schema = ? AND table_name = 'clearance_requests' AND column_name = 'nim' AND non_unique = 0",
      [process.env.DB_NAME],
    );
    assert.equal(nimUnique[0]?.total, 0);
    const [migrationRows] = await pool.query<Array<{ total: number }> & mysql.RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM __drizzle_migrations',
    );
    assert.equal(migrationRows[0]?.total, 1);
    process.stdout.write(`Verified MySQL schema: 13 domain tables, ${fkRows[0]?.total} foreign keys, ${indexRows[0]?.total} secondary indexes, ${checkRows[0]?.total} checks, 1 migration\n`);
  } finally {
    await pool.end();
  }
});

test('live health and readiness endpoints use the migrated MySQL connection', async () => {
  const { createApp } = await import('../src/main.js');
  const app = await createApp();
  await app.init();
  try {
    const health = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    assert.deepEqual(health.body, { data: { status: 'ok' } });
    const ready = await request(app.getHttpServer()).get('/api/v1/ready').expect(200);
    assert.deepEqual(ready.body, { data: { status: 'ready' } });
  } finally {
    await app.close();
  }
});

test('readiness returns 503 when a real MySQL connection attempt fails', async () => {
  const unavailablePool = mysql.createPool({
    host: '127.0.0.1', port: 1,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    connectTimeout: 500, connectionLimit: 1,
  });
  const { AppModule } = await import('../src/app.module.js');
  const { configureApp } = await import('../src/main.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DatabaseService).useValue({ isReady: async () => {
      try {
        await unavailablePool.query('SELECT 1');
        return true;
      } catch {
        return false;
      }
    } })
    .compile();
  const app = configureApp(moduleRef.createNestApplication({ bodyParser: false, logger: false }));
  await app.init();
  try {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    const ready = await request(app.getHttpServer()).get('/api/v1/ready').expect(503);
    assert.equal(ready.body.error.code, 'SERVICE_UNAVAILABLE');
    assert.doesNotMatch(JSON.stringify(ready.body), /127\.0\.0\.1|DB_PASSWORD/);
  } finally {
    await app.close();
    await unavailablePool.end();
  }
});
