import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import argon2 from 'argon2';
import type { Pool } from 'mysql2/promise';
import { AuthService } from '../src/auth/auth.service.js';
import { adminCookieName, cookieOptions, csrfCookieName } from '../src/auth/cookies.js';

test('production cookies are host-only, Secure and scoped to the root path', () => {
  assert.equal(adminCookieName('production'), '__Host-ith_admin');
  assert.equal(csrfCookieName('production'), '__Host-ith_csrf');
  assert.deepEqual(cookieOptions('production', true), {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/',
  });
  assert.deepEqual(cookieOptions('development', true), {
    httpOnly: true, secure: false, sameSite: 'lax', path: '/',
  });
});

test('login rejects a role outside the active allowlist even with a correct password', async () => {
  const password = `Test!${randomUUID()}Strong`;
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const pool = {
    execute: async (sql: string) => sql.startsWith('SELECT') ? [[{
      id: 1, email: 'legacy@example.invalid', display_name: 'Legacy',
      role: 'UNSUPPORTED_ROLE', is_active: 1, password_hash: hash,
    }]] : [{ affectedRows: 1 }],
  } as unknown as Pool;
  const service = new AuthService(pool);
  await assert.rejects(() => service.login('legacy@example.invalid', password, '127.0.0.1'),
    (error: { status?: number }) => error.status === 401);
});
