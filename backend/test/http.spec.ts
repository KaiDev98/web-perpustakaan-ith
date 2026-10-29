import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Body, Controller, Post, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString, MinLength } from 'class-validator';
import request from 'supertest';
import { DatabaseService } from '../src/database/database.module.js';

Object.assign(process.env, {
  NODE_ENV: 'test', PORT: '3001', DB_HOST: '127.0.0.1', DB_PORT: '3307',
  DB_NAME: 'ith_library', DB_USER: 'ith_app', DB_PASSWORD: 'test-only-password-123',
  CORS_ORIGINS: 'http://localhost:3000', ENABLE_SWAGGER: 'true',
});

class DemoDto {
  @IsString()
  @MinLength(2)
  name!: string;
}

@Controller('test-validation')
class ValidationController {
  @Post()
  submit(@Body() body: DemoDto): { name: string } {
    return { name: body.name };
  }
}

test('HTTP foundation: response, readiness, validation, errors, headers, OpenAPI', async (t) => {
  const { AppModule } = await import('../src/app.module.js');
  const { configureApp } = await import('../src/main.js');
  let available = true;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers: [ValidationController] })
    .overrideProvider(DatabaseService).useValue({ isReady: async () => available })
    .compile();
  const app: INestApplication = configureApp(moduleRef.createNestApplication({ bodyParser: false, logger: false }));
  await app.init();
  const server = app.getHttpServer();
  try {
    await t.test('health and ready success expose only minimal status', async () => {
      const health = await request(server).get('/api/v1/health').expect(200);
      assert.deepEqual(health.body, { data: { status: 'ok' } });
      assert.match(health.headers['x-request-id'] as string, /^[0-9a-f-]{36}$/);
      assert.equal(health.headers['x-content-type-options'], 'nosniff');
      const ready = await request(server).get('/api/v1/ready').expect(200);
      assert.deepEqual(ready.body, { data: { status: 'ready' } });
    });

    await t.test('ready returns 503 without database details', async () => {
      available = false;
      const response = await request(server).get('/api/v1/ready').expect(503);
      assert.deepEqual(response.body, { error: { code: 'SERVICE_UNAVAILABLE', message: 'Layanan belum siap.' } });
      assert.doesNotMatch(JSON.stringify(response.body), /127\.0\.0\.1|test-only-password/);
      available = true;
    });

    await t.test('global DTO validation rejects extra and short values', async () => {
      const extra = await request(server).post('/api/v1/test-validation').send({ name: 'Budi', status: 'SELESAI' }).expect(400);
      assert.equal(extra.body.error.code, 'VALIDATION_ERROR');
      const short = await request(server).post('/api/v1/test-validation').send({ name: 'A' }).expect(400);
      assert.equal(short.body.error.code, 'VALIDATION_ERROR');
      const okay = await request(server).post('/api/v1/test-validation').send({ name: 'Budi' }).expect(201);
      assert.deepEqual(okay.body, { data: { name: 'Budi' } });
    });

    await t.test('malformed JSON, oversized body, and unknown route have safe errors', async () => {
      const malformed = await request(server).post('/api/v1/test-validation').set('Content-Type', 'application/json').send('{').expect(400);
      assert.equal(malformed.body.error.code, 'VALIDATION_ERROR');
      const large = await request(server).post('/api/v1/test-validation').send({ name: 'A'.repeat(70000) }).expect(413);
      assert.equal(large.body.error.code, 'PAYLOAD_TOO_LARGE');
      const missing = await request(server).get('/api/v1/unknown?email=private@example.org').expect(404);
      assert.equal(missing.body.error.code, 'NOT_FOUND');
      assert.doesNotMatch(JSON.stringify(missing.body), /private@example.org/);
    });

    await t.test('CORS is explicit and OpenAPI lists only implemented routes', async () => {
      const allowed = await request(server).get('/api/v1/health').set('Origin', 'http://localhost:3000').expect(200);
      assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:3000');
      const denied = await request(server).get('/api/v1/health').set('Origin', 'https://evil.example').expect(200);
      assert.equal(denied.headers['access-control-allow-origin'], undefined);
      const docs = await request(server).get('/api-docs-json').expect(200);
      assert.deepEqual(Object.keys(docs.body.paths).sort(), ['/api/v1/health', '/api/v1/ready']);
    });
  } finally {
    await app.close();
  }
});
