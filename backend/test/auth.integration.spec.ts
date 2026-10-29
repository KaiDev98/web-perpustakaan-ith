import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import test from 'node:test';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import request from 'supertest';

dotenv.config({ path: '../.env', quiet: true });
const origin = 'http://127.0.0.1:3002';
const password = `Test!${randomUUID()}Strong`;
const rejectedResetPassword = `Rejected!${randomUUID()}Strong`;
const email = `auth-${randomUUID()}@example.invalid`;
const superEmail = `super-${randomUUID()}@example.invalid`;
const cookieValue = (setCookie: string[] | undefined, name: string) =>
  setCookie?.find((value) => value.startsWith(`${name}=`))?.split(';')[0];
const setCookies = (value: unknown): string[] => Array.isArray(value) ? value as string[] : [];

test('admin authentication, CSRF, roles, expiry, revocation and headers on real MySQL', async () => {
  assert.ok(['development', 'test'].includes(process.env.NODE_ENV ?? ''), 'Auth fixtures are disabled outside development/test');
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_NAME,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, connectionLimit: 2,
  });
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  let adminId = 0;
  let superId = 0;
  let cmsContentId = 0;
  let cmsResourceId = 0;
  let cmsMenuId = 0;
  let cmsMediaId = 0;
  const { createApp } = await import('../src/main.js');
  const app = await createApp();
  await app.init();
  const http = app.getHttpServer();
  try {
    const [adminResult] = await pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO users (email, display_name, password_hash, role, is_active) VALUES (?, 'Test Admin', ?, 'ADMIN', 1)",
      [email, hash],
    );
    adminId = adminResult.insertId;
    const [superResult] = await pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO users (email, display_name, password_hash, role, is_active) VALUES (?, 'Test Superadmin', ?, 'SUPERADMIN', 1)",
      [superEmail, hash],
    );
    superId = superResult.insertId;

    const csrfResponse = await request(http).get('/api/v1/auth/csrf').expect(200);
    const csrf = csrfResponse.body.data.token as string;
    const csrfCookie = cookieValue(setCookies(csrfResponse.headers['set-cookie']), 'ith_csrf');
    assert.ok(csrfCookie);
    assert.match(csrfResponse.headers['cache-control'] as string, /no-store/);
    await request(http).get('/api/v1/auth/csrf').set('Origin', 'http://localhost:3000').expect(403);
    await request(http).get('/api/v1/auth/csrf').set('Sec-Fetch-Site', 'cross-site').expect(403);

    await request(http).post('/api/v1/auth/login').set('Origin', origin).send({ email, password }).expect(403);
    await request(http).post('/api/v1/auth/login').set('Origin', 'http://localhost:3000').set('Cookie', csrfCookie).set('X-CSRF-Token', csrf).send({ email, password }).expect(403);
    await request(http).post('/api/v1/auth/login').set('Origin', origin).set('Sec-Fetch-Site', 'cross-site')
      .set('Cookie', csrfCookie).set('X-CSRF-Token', csrf).send({ email, password }).expect(403);
    const login = (account: string, secret: string) => request(http).post('/api/v1/auth/login')
      .set('Origin', origin).set('Cookie', csrfCookie).set('X-CSRF-Token', csrf).send({ email: account, password: secret });
    const unknown = await login(`missing-${randomUUID()}@example.invalid`, password).expect(401);
    const wrong = await login(email, 'wrong-password').expect(401);
    assert.deepEqual(unknown.body, wrong.body);

    const adminLogin = await login(email, password).expect(200);
    const adminCookie = cookieValue(setCookies(adminLogin.headers['set-cookie']), 'ith_admin');
    assert.ok(adminCookie);
    assert.match(setCookies(adminLogin.headers['set-cookie']).join(' '), /HttpOnly/);
    assert.match(setCookies(adminLogin.headers['set-cookie']).join(' '), /SameSite=Lax/);
    assert.doesNotMatch(JSON.stringify(adminLogin.body), /password_hash|token_hash|Test!/);
    const me = await request(http).get('/api/v1/admin/me').set('Cookie', adminCookie).expect(200);
    assert.equal(me.body.data.role, 'ADMIN');
    assert.deepEqual(me.body.data.permissions, [
      'admin.me', 'auth.logout', 'requests.summary.read',
      'requests.literacy.read', 'requests.literacy.status',
      'requests.clearance.read', 'requests.clearance.status',
    ]);
    assert.ok(!me.body.data.permissions.includes('content.manage'));
    assert.match(me.headers['cache-control'] as string, /no-store/);
    const noSession = await request(http).get('/api/v1/admin/me').expect(401);
    assert.match(noSession.headers['cache-control'] as string, /no-store/);
    await request(http).post(`/api/v1/admin/users/${adminId}/password-reset`)
      .set('Origin', origin).set('Cookie', `${adminCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf)
      .send({ password: rejectedResetPassword }).expect(403);
    await request(http).post(`/api/v1/admin/users/${superId}/password-reset`)
      .set('Origin', origin).set('Cookie', `${adminCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf)
      .send({ password: rejectedResetPassword }).expect(403);
    await request(http).post(`/api/v1/admin/users/${superId}/password-reset`)
      .set('Origin', origin).set('Cookie', csrfCookie).set('X-CSRF-Token', csrf)
      .send({ password: rejectedResetPassword }).expect(401);

    const superLogin = await login(superEmail, password).expect(200);
    const superCookie = cookieValue(setCookies(superLogin.headers['set-cookie']), 'ith_admin');
    assert.ok(superCookie);
    const superMe = await request(http).get('/api/v1/admin/me').set('Cookie', superCookie).expect(200);
    assert.ok(superMe.body.data.permissions.includes('content.manage'));
    assert.ok(superMe.body.data.permissions.includes('requests.literacy.status'));
    const cmsBody = { slug: `e2e-${randomUUID()}`, content_type: 'NEWS', title: 'Test news', body: 'Safe plain text' };
    await request(http).post('/api/v1/admin/cms/contents').set('Origin', origin)
      .set('Cookie', `${adminCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf).send(cmsBody).expect(403);
    await request(http).post('/api/v1/admin/cms/contents').set('Origin', origin)
      .set('Cookie', csrfCookie).set('X-CSRF-Token', csrf).send(cmsBody).expect(401);
    await request(http).post('/api/v1/admin/cms/contents').set('Origin', origin)
      .set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf)
      .send({ ...cmsBody, body: '<script>alert(1)</script>' }).expect(400);
    const created = await request(http).post('/api/v1/admin/cms/contents').set('Origin', origin)
      .set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf).send(cmsBody).expect(201);
    cmsContentId = created.body.data.id as number;
    assert.ok(cmsContentId);
    await request(http).get(`/api/v1/public/contents/${cmsContentId}`).expect(404);
    await request(http).patch(`/api/v1/admin/cms/contents/${cmsContentId}`).set('Origin', origin)
      .set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf).send({ is_published: true }).expect(200);
    await request(http).get(`/api/v1/public/contents/${cmsContentId}`).expect(200);
    await request(http).delete(`/api/v1/admin/cms/contents/${cmsContentId}`).set('Origin', origin)
      .set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf).expect(400);
    await request(http).patch(`/api/v1/admin/cms/contents/${cmsContentId}`).set('Origin', origin)
      .set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf).send({ is_published: false }).expect(200);
    await request(http).delete(`/api/v1/admin/cms/contents/${cmsContentId}`).set('Origin', origin)
      .set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf).expect(200);
    cmsContentId = 0;
    await request(http).get('/api/v1/admin/cms/settings').set('Cookie', adminCookie).expect(403);
    await request(http).get('/api/v1/admin/cms/settings').expect(401);
    await request(http).get('/api/v1/public/settings').expect(200);
    await request(http).post('/api/v1/admin/cms/resources').set('Origin', origin)
      .set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf)
      .send({ resource_type: 'E_BOOK', title: 'Unsafe', url: 'javascript:alert(1)' }).expect(400);
    const resource = await request(http).post('/api/v1/admin/cms/resources').set('Origin', origin)
      .set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf)
      .send({ resource_type: 'E_BOOK', title: 'Test resource', url: 'https://example.org/book', is_active: false }).expect(201);
    cmsResourceId = resource.body.data.id as number;
    const publicResources = await request(http).get('/api/v1/public/resources?resource_type=E_BOOK').expect(200);
    assert.ok(!(publicResources.body.data.items as Array<{ id: number }>).some((item) => item.id === cmsResourceId));
    const menu = await request(http).post('/api/v1/admin/cms/menu').set('Origin', origin)
      .set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf)
      .send({ label: 'Test menu', target_url: '/profil', position: 99, is_active: false }).expect(201);
    cmsMenuId = menu.body.data.id as number;
    await request(http).patch(`/api/v1/admin/cms/menu/${cmsMenuId}`).set('Origin', origin)
      .set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf).send({ is_active: true, position: 1 }).expect(200);
    const publicMenu = await request(http).get('/api/v1/public/menu').expect(200);
    assert.ok((publicMenu.body.data.items as Array<{ id: number }>).some((item) => item.id === cmsMenuId));
    await request(http).patch(`/api/v1/admin/cms/resources/${cmsResourceId}`).set('Origin', origin)
      .set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf).send({ is_active: true }).expect(200);
    const visibleResources = await request(http).get('/api/v1/public/resources?resource_type=E_BOOK').expect(200);
    assert.ok((visibleResources.body.data.items as Array<{ id: number }>).some((item) => item.id === cmsResourceId));
    await request(http).post('/api/v1/admin/cms/media').set('Origin', origin)
      .set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf)
      .attach('file', Buffer.from('<svg onload="alert(1)"/>'), { filename: 'unsafe.svg', contentType: 'image/svg+xml' }).expect(400);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=', 'base64');
    const upload = await request(http).post('/api/v1/admin/cms/media').set('Origin', origin)
      .set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf)
      .attach('file', png, { filename: 'test.png', contentType: 'image/png' }).expect(201);
    cmsMediaId = upload.body.data.id as number;
    await request(http).get(`/api/v1/public/media/${cmsMediaId}`).expect(404);
    await request(http).get('/api/v1/admin/cms/media').set('Cookie', adminCookie).expect(403);
    await request(http).delete(`/api/v1/admin/cms/media/${cmsMediaId}`).set('Origin', origin)
      .set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf).expect(200);
    cmsMediaId = 0;
    await request(http).delete(`/api/v1/admin/cms/menu/${cmsMenuId}`).set('Origin', origin)
      .set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf).expect(200);
    cmsMenuId = 0;
    await request(http).delete(`/api/v1/admin/cms/resources/${cmsResourceId}`).set('Origin', origin)
      .set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf).expect(200);
    cmsResourceId = 0;
    const replacementPassword = `Replacement!${randomUUID()}Strong`;
    await request(http).post(`/api/v1/admin/users/${adminId}/password-reset`)
      .set('Origin', origin).set('Cookie', `${superCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf)
      .send({ password: replacementPassword }).expect(200);
    await login(email, password).expect(401);
    const replacementLogin = await login(email, replacementPassword).expect(200);
    const replacementCookie = cookieValue(setCookies(replacementLogin.headers['set-cookie']), 'ith_admin');
    assert.ok(replacementCookie);
    await request(http).post('/api/v1/auth/logout').set('Origin', origin)
      .set('Cookie', `${replacementCookie}; ${csrfCookie}`).set('X-CSRF-Token', csrf).expect(200);
    await request(http).get('/api/v1/admin/me').set('Cookie', replacementCookie).expect(401);

    const token = superCookie.split('=')[1]!;
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await pool.execute('UPDATE admin_sessions SET idle_expires_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 SECOND) WHERE token_hash = ?', [tokenHash]);
    await request(http).get('/api/v1/admin/me').set('Cookie', superCookie).expect(401);

    await pool.execute('UPDATE users SET is_active = 0 WHERE id = ?', [adminId]);
    await login(email, replacementPassword).expect(401);
    await login(`missing-${randomUUID()}@example.invalid`, password).expect(401);
    await login(`missing-${randomUUID()}@example.invalid`, password).expect(401);
    await login(`missing-${randomUUID()}@example.invalid`, password).expect(401);
    await login(`missing-${randomUUID()}@example.invalid`, password).expect(401);
    await login(`missing-${randomUUID()}@example.invalid`, password).expect(429);
    const [audits] = await pool.execute<Array<{ action: string; outcome: string }> & mysql.RowDataPacket[]>(
      'SELECT action, outcome FROM audit_logs WHERE actor_user_id IN (?, ?)', [adminId, superId],
    );
    assert.ok(audits.some((row) => row.action === 'AUTH_LOGIN' && row.outcome === 'SUCCESS'));
    assert.ok(audits.some((row) => row.action === 'AUTH_LOGIN' && row.outcome === 'FAILURE'));
    assert.ok(audits.some((row) => row.action === 'AUTH_LOGOUT' && row.outcome === 'SUCCESS'));
  } finally {
    await app.close();
    if (cmsContentId) await pool.execute('DELETE FROM contents WHERE id = ?', [cmsContentId]);
    if (cmsMenuId) await pool.execute('DELETE FROM menu_items WHERE id = ?', [cmsMenuId]);
    if (cmsResourceId) await pool.execute('DELETE FROM resource_links WHERE id = ?', [cmsResourceId]);
    if (cmsMediaId) await pool.execute('DELETE FROM media_assets WHERE id = ?', [cmsMediaId]);
    if (adminId || superId) {
      await pool.execute('DELETE FROM audit_logs WHERE actor_user_id IN (?, ?)', [adminId, superId]);
      await pool.execute('DELETE FROM admin_sessions WHERE user_id IN (?, ?)', [adminId, superId]);
      await pool.execute('DELETE FROM users WHERE id IN (?, ?)', [adminId, superId]);
    }
    await pool.end();
  }
});
