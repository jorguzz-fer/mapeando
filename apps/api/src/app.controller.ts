import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { aiEnabled } from './config/env.js';

@ApiTags('health')
@Controller('api')
export class AppController {
  @Get('health')
  health(): { ok: true; ia: boolean; ts: string } {
    return { ok: true, ia: aiEnabled(), ts: new Date().toISOString() };
  }
}
