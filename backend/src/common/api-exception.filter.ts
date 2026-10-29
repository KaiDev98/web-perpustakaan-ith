import { ArgumentsHost, Catch, HttpException, HttpStatus, type ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';

type RequestWithError = Request & { errorCategory?: string };
type ValidationPayload = { code?: string; details?: Array<{ field: string; message: string }> };

function errorCode(status: number): string {
  switch (status) {
    case 400: return 'VALIDATION_ERROR';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 413: return 'PAYLOAD_TOO_LARGE';
    case 429: return 'RATE_LIMITED';
    case 503: return 'SERVICE_UNAVAILABLE';
    default: return status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST';
  }
}

function publicMessage(code: string): string {
  switch (code) {
    case 'VALIDATION_ERROR': return 'Permintaan tidak valid.';
    case 'UNAUTHORIZED': return 'Autentikasi diperlukan.';
    case 'FORBIDDEN': return 'Akses ditolak.';
    case 'NOT_FOUND': return 'Sumber tidak ditemukan.';
    case 'CONFLICT': return 'Permintaan bertentangan dengan keadaan saat ini.';
    case 'PAYLOAD_TOO_LARGE': return 'Ukuran permintaan terlalu besar.';
    case 'RATE_LIMITED': return 'Terlalu banyak permintaan.';
    case 'SERVICE_UNAVAILABLE': return 'Layanan belum siap.';
    default: return 'Terjadi kesalahan server.';
  }
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithError>();
    const response = ctx.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const code = errorCode(status);
    request.errorCategory = code;
    const payload = exception instanceof HttpException ? exception.getResponse() : null;
    const details = typeof payload === 'object' && payload !== null &&
      (payload as ValidationPayload).code === 'VALIDATION_ERROR' ?
      (payload as ValidationPayload).details : undefined;
    response.status(status).json({ error: { code, message: publicMessage(code), ...(details ? { details } : {}) } });
  }
}

export function bodyParserErrorResponse(status: number): { error: { code: string; message: string } } {
  const code = errorCode(status);
  return { error: { code, message: publicMessage(code) } };
}
