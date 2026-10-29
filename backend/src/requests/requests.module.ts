import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RequestsService } from './requests.service.js';
import { PublicRequestsController, AdminRequestsController } from './requests.controller.js';

@Module({ imports: [AuthModule], controllers: [PublicRequestsController, AdminRequestsController], providers: [RequestsService] })
export class RequestsModule {}
