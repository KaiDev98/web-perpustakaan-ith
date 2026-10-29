import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export type RequestWithLog = Request & { requestId?: string; errorCategory?: string };

export function requestLogger(request: RequestWithLog, response: Response, next: NextFunction): void {
  const requestId = randomUUID();
  const start = process.hrtime.bigint();
  request.requestId = requestId;
  response.setHeader('X-Request-ID', requestId);
  response.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const route = typeof request.route?.path === 'string' ? request.route.path : '<unmatched>';
    const event = {
      level: response.statusCode >= 500 ? 'error' : 'info',
      event: 'http_request',
      request_id: requestId,
      method: request.method,
      route,
      status_code: response.statusCode,
      duration_ms: Math.round(durationMs * 100) / 100,
      error_category: request.errorCategory ?? (response.statusCode >= 400 ? 'HTTP_ERROR' : null),
    };
    process.stdout.write(`${JSON.stringify(event)}\n`);
  });
  next();
}
