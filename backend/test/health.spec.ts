import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpException } from '@nestjs/common';
import { HealthController } from '../src/health/health.controller.js';
import type { DatabaseService } from '../src/database/database.module.js';

test('health reports process liveness independently of database', () => {
  const controller = new HealthController({ isReady: async () => false } as DatabaseService);
  assert.deepEqual(controller.health(), { status: 'ok' });
});

test('ready reports a live database and rejects an unavailable database', async () => {
  const healthy = new HealthController({ isReady: async () => true } as DatabaseService);
  assert.deepEqual(await healthy.ready(), { status: 'ready' });
  const unavailable = new HealthController({ isReady: async () => false } as DatabaseService);
  await assert.rejects(unavailable.ready(), (error: unknown) => error instanceof HttpException && error.getStatus() === 503);
});
