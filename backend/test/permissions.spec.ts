import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPermission, permissionsForRole } from '../src/auth/permissions.js';

test('ADMIN is limited to application requests and account self-service', () => {
  const permissions = permissionsForRole('ADMIN');
  assert.deepEqual(permissions, [
    'admin.me', 'auth.logout', 'requests.summary.read',
    'requests.literacy.read', 'requests.literacy.status',
    'requests.clearance.read', 'requests.clearance.status',
  ]);
  for (const restricted of ['content.manage', 'navigation.manage', 'resources.manage', 'media.manage',
    'settings.manage', 'users.manage', 'audit.read'] as const) {
    assert.equal(hasPermission('ADMIN', restricted), false);
    assert.equal(hasPermission('SUPERADMIN', restricted), true);
  }
});
