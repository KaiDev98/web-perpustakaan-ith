import { timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService, type AdminUser } from './auth.service.js';
import { hasPermission, type Permission } from './permissions.js';
import { adminCookieName, csrfCookieName } from './cookies.js';

export type AdminRequest = Request & { admin?: { user: AdminUser; sessionId: number } };
const cookie = (request: Request, name: string): string | undefined => {
  const header = request.headers.cookie;
  return header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
};

export function sessionToken(request: Request): string | undefined {
  return cookie(request, adminCookieName(process.env.NODE_ENV === 'production' ? 'production' : 'development'));
}
export function csrfToken(request: Request): string | undefined {
  return cookie(request, csrfCookieName(process.env.NODE_ENV === 'production' ? 'production' : 'development'));
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const session = await this.auth.session(sessionToken(request));
    if (!session) throw new UnauthorizedException();
    request.admin = session;
    return true;
  }
}

const REQUIRED_PERMISSION = 'required_permission';
export const RequirePermission = (permission: Permission) => SetMetadata(REQUIRED_PERMISSION, permission);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const permission = this.reflector.getAllAndOverride<Permission>(REQUIRED_PERMISSION, [context.getHandler(), context.getClass()]);
    if (!permission || !request.admin || !hasPermission(request.admin.user.role, permission)) throw new ForbiddenException();
    return true;
  }
}

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.headers.origin;
    if (request.headers['sec-fetch-site'] === 'cross-site') throw new ForbiddenException();
    const expectedOrigin = process.env.ADMIN_ORIGIN ?? 'http://127.0.0.1:3002';
    const header = request.header('x-csrf-token');
    const stored = csrfToken(request);
    if (!origin || origin !== expectedOrigin || !header || !stored) throw new ForbiddenException();
    const first = Buffer.from(header);
    const second = Buffer.from(stored);
    if (first.length !== second.length || !timingSafeEqual(first, second)) throw new ForbiddenException();
    return true;
  }
}
