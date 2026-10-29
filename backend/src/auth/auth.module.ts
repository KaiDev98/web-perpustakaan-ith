import { Module } from '@nestjs/common';
import { AuthController, AdminController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CsrfGuard, PermissionGuard, SessionGuard } from './auth.guards.js';

@Module({ controllers: [AuthController, AdminController], providers: [AuthService, CsrfGuard, PermissionGuard, SessionGuard], exports: [AuthService, CsrfGuard, PermissionGuard, SessionGuard] })
export class AuthModule {}
