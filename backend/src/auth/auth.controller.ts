import { randomBytes } from 'node:crypto';
import { Body, Controller, ForbiddenException, Get, HttpCode, Param, ParseIntPipe, Post, Req, Res, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { type AdminRequest, CsrfGuard, PermissionGuard, RequirePermission, SessionGuard } from './auth.guards.js';
import { permissionsForRole } from './permissions.js';
import { adminCookieName, cookieOptions, csrfCookieName, type Mode } from './cookies.js';

class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) password!: string;
}
class ResetPasswordDto {
  @IsString() @MinLength(16) password!: string;
}
const mode = (): Mode => process.env.NODE_ENV === 'production' ? 'production' : 'development';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('csrf')
  csrf(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    if ((request.headers.origin && request.headers.origin !== (process.env.ADMIN_ORIGIN ?? 'http://127.0.0.1:3002')) ||
        request.headers['sec-fetch-site'] === 'cross-site') throw new ForbiddenException();
    const token = randomBytes(32).toString('base64url');
    response.setHeader('Cache-Control', 'no-store');
    response.cookie(csrfCookieName(mode()), token, cookieOptions(mode(), false));
    return { token };
  }

  @Post('login') @HttpCode(200) @UseGuards(CsrfGuard)
  async login(@Body() body: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    const { user, token } = await this.auth.login(body.email, body.password, request.ip ?? 'unknown');
    response.cookie(adminCookieName(mode()), token, { ...cookieOptions(mode(), true), maxAge: 8 * 60 * 60_000 });
    return { id: user.id, display_name: user.display_name, role: user.role, permissions: permissionsForRole(user.role) };
  }

  @Post('logout') @HttpCode(200) @UseGuards(SessionGuard, CsrfGuard)
  async logout(@Req() request: AdminRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    await this.auth.logout(request.admin!.sessionId, request.admin!.user.id);
    response.clearCookie(adminCookieName(mode()), cookieOptions(mode(), true));
    return { status: 'logged_out' };
  }
}

@Controller('admin')
@UseGuards(SessionGuard, PermissionGuard)
export class AdminController {
  constructor(private readonly auth: AuthService) {}

  @Get('me') @RequirePermission('admin.me')
  me(@Req() request: AdminRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    const { id, display_name, role } = request.admin!.user;
    return { id, display_name, role, permissions: permissionsForRole(role) };
  }

  @Post('users/:id/password-reset') @HttpCode(200) @RequirePermission('users.manage') @UseGuards(CsrfGuard)
  async resetPassword(@Param('id', ParseIntPipe) id: number, @Body() body: ResetPasswordDto,
    @Req() request: AdminRequest, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    await this.auth.resetPassword(id, body.password, request.admin!.user.id);
    return { status: 'password_updated' };
  }
}
