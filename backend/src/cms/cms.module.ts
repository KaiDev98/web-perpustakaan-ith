import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CmsService } from './cms.service.js';
import { CmsAdminController, CmsPublicController } from './cms.controller.js';
import { MediaController } from './media.controller.js';

@Module({ imports: [AuthModule], controllers: [CmsAdminController, CmsPublicController, MediaController], providers: [CmsService] })
export class CmsModule {}
