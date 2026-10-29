import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import test from 'node:test';
import { parseCorsOrigins, validateEnvironment } from '../src/config/env.js';

const valid = {
  NODE_ENV: 'development', PORT: '3001', DB_HOST: '127.0.0.1', DB_PORT: '3307',
  DB_NAME: 'ith_library', DB_USER: 'ith_app', DB_PASSWORD: 'test-only-password-123',
  CORS_ORIGINS: 'http://localhost:3000', ENABLE_SWAGGER: 'false',
};

test('environment accepts explicit local configuration', () => {
  const env = validateEnvironment(valid);
  assert.equal(env.DB_PORT, 3307);
  assert.equal(env.BODY_LIMIT_BYTES, 65536);
  assert.deepEqual(parseCorsOrigins(env.CORS_ORIGINS, env.NODE_ENV), ['http://localhost:3000']);
});

test('environment rejects missing and placeholder password without echoing it', () => {
  assert.throws(() => validateEnvironment({ ...valid, DB_PASSWORD: undefined }), /DB_PASSWORD/);
  assert.throws(() => validateEnvironment({ ...valid, DB_PASSWORD: 'replace-with-strong-local-password' }), /placeholder/);
});

test('production rejects Swagger and insecure CORS origins', () => {
  assert.throws(() => validateEnvironment({ ...valid, NODE_ENV: 'production', ENABLE_SWAGGER: 'true' }), /CORS_ORIGINS/);
  assert.throws(() => validateEnvironment({ ...valid, NODE_ENV: 'production', CORS_ORIGINS: 'https://library.example.org', ENABLE_SWAGGER: 'true' }), /ENABLE_SWAGGER/);
  assert.throws(() => parseCorsOrigins('*', 'development'), /CORS_ORIGINS/);
});

test('application process fails early for invalid environment', () => {
  const executable = resolve('dist-test/src/main.js');
  const result = spawnSync(process.execPath, [executable], {
    cwd: process.cwd(),
    env: { ...process.env, ...valid, DB_PASSWORD: 'replace-with-strong-local-password' },
    encoding: 'utf8', timeout: 10000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /startup_failed/);
  assert.match(result.stderr, /DB_PASSWORD/);
  assert.doesNotMatch(result.stderr, /test-only-password-123/);
});
