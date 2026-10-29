import assert from 'node:assert/strict';
import test from 'node:test';
import { navigationForPermissions } from '../apps/admin/lib/navigation.js';

test('ADMIN navigation shows only request operations', () => {
  const items = navigationForPermissions([
    'admin.me', 'requests.summary.read', 'requests.literacy.read', 'requests.clearance.read',
  ]);
  assert.deepEqual(items.map((item) => item.label), [
    'Ringkasan Permohonan', 'Form Pustakawan', 'Daftar Pemohon',
  ]);
});

test('content administration requires permissions supplied by backend', () => {
  const items = navigationForPermissions(['requests.summary.read', 'content.read', 'content.manage', 'audit.read']);
  assert.ok(items.some((item) => item.label === 'Berita'));
  assert.ok(items.some((item) => item.label === 'Audit Log'));
  assert.ok(!items.some((item) => item.label === 'Akun Administrator'));
});
