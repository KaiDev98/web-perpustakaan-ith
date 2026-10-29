import assert from 'node:assert/strict';
import test from 'node:test';
import { safeText, safeUrl } from '../src/cms/cms.service.js';
import { hasPermission } from '../src/auth/permissions.js';
import { verifiedType } from '../src/cms/media.controller.js';

test('CMS accepts only safe content text and links', () => {
  assert.equal(safeText('Informasi layanan\nPerpustakaan'), true);
  assert.equal(safeText('<script>alert(1)</script>'), false);
  assert.equal(safeUrl('https://example.org/resource'), true);
  assert.equal(safeUrl('javascript:alert(1)'), false);
  assert.equal(safeUrl('//evil.example', true), false);
  assert.equal(safeUrl('/profil', true), true);
});

test('media signatures allow raster images and reject active document formats', () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=', 'base64');
  assert.equal(verifiedType(png)?.mime, 'image/png');
  assert.equal(verifiedType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), null);
  assert.equal(verifiedType(Buffer.from('<svg onload="alert(1)"/>')), null);
  assert.equal(verifiedType(Buffer.from('%PDF-1.7')), null);
});

test('CMS permissions belong only to SUPERADMIN', () => {
  for (const permission of ['content.manage', 'navigation.manage', 'resources.manage', 'slides.manage', 'settings.manage'] as const) {
    assert.equal(hasPermission('SUPERADMIN', permission), true);
    assert.equal(hasPermission('ADMIN', permission), false);
  }
});
