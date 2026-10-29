import 'reflect-metadata';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import type { AppEnv } from './config/env.js';
import { parseCorsOrigins } from './config/env.js';
import { AppModule } from './app.module.js';
import { bodyParserErrorResponse } from './common/api-exception.filter.js';
import { requestLogger, type RequestWithLog } from './common/request-logger.js';
import { createValidationPipe } from './common/validation.pipe.js';
import { HealthModule } from './health/health.module.js';

export function configureApp(app: INestApplication): INestApplication {
  const config = app.get<ConfigService<AppEnv, true>>(ConfigService);
  const mode = config.get('NODE_ENV', { infer: true });
  const bodyLimit = config.get('BODY_LIMIT_BYTES', { infer: true });
  const proxyHops = config.get('TRUST_PROXY_HOPS', { infer: true });
  const expressInstance = app.getHttpAdapter().getInstance() as express.Express;
  expressInstance.set('trust proxy', proxyHops);

  app.use(helmet({ contentSecurityPolicy: mode === 'production' ? undefined : false }));
  app.use(requestLogger);
  app.use(express.json({ limit: bodyLimit, strict: true }));
  app.use(express.urlencoded({ limit: bodyLimit, extended: false }));
  const bodyErrorHandler: ErrorRequestHandler = (error: unknown, request: RequestWithLog, response, next) => {
    if (!error || typeof error !== 'object') return next(error);
    const status = 'status' in error && typeof error.status === 'number' && error.status === 413 ? 413 : 400;
    request.errorCategory = status === 413 ? 'PAYLOAD_TOO_LARGE' : 'VALIDATION_ERROR';
    response.status(status).json(bodyParserErrorResponse(status));
  };
  app.use(bodyErrorHandler);

  const allowlist = parseCorsOrigins(config.get('CORS_ORIGINS', { infer: true }), mode);
  app.enableCors({
    credentials: false,
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) =>
      callback(null, !origin || allowlist.includes(origin)),
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(createValidationPipe());

  if (mode !== 'production' && config.get('ENABLE_SWAGGER', { infer: true }) === 'true') {
    const swaggerConfig = new DocumentBuilder().setTitle('Perpustakaan ITH API').setVersion('1.0.0').build();
    const document = SwaggerModule.createDocument(app, swaggerConfig, { include: [HealthModule] });
    SwaggerModule.setup('api-docs', app, document);
  }
  app.enableShutdownHooks();
  return app;
}

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bodyParser: false, logger: false, abortOnError: false });
  return configureApp(app);
}

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const config = app.get<ConfigService<AppEnv, true>>(ConfigService);
  await app.listen(config.get('PORT', { infer: true }), '127.0.0.1');
  process.stdout.write(`${JSON.stringify({ level: 'info', event: 'server_started' })}\n`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  bootstrap().catch((error: unknown) => {
    const detail = error instanceof Error && error.message.startsWith('Invalid environment variables:') ? error.message : undefined;
    process.stderr.write(`${JSON.stringify({ level: 'error', event: 'startup_failed', category: 'CONFIG_OR_RUNTIME', ...(detail ? { detail } : {}) })}\n`);
    process.exitCode = 1;
  });
}
