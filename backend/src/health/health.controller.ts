import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.module.js';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get('health')
  @ApiOkResponse({ schema: { example: { data: { status: 'ok' } } } })
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOkResponse({ schema: { example: { data: { status: 'ready' } } } })
  @ApiServiceUnavailableResponse({ schema: { example: { error: { code: 'SERVICE_UNAVAILABLE', message: 'Layanan belum siap.' } } } })
  async ready(): Promise<{ status: 'ready' }> {
    if (!(await this.database.isReady())) {
      throw new HttpException('Service not ready', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { status: 'ready' };
  }
}
