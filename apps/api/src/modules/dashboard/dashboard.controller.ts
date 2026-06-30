import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { DashboardStats, SessionUser } from '@mapeando/shared';
import { AuthGuard } from '../../common/auth.guard.js';
import { CurrentUser } from '../../common/current-user.decorator.js';
import { dashboardService } from './dashboard.service.js';

@ApiTags('dashboard')
@Controller('api/dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  @Get('stats')
  stats(@CurrentUser() u: SessionUser): Promise<DashboardStats> {
    return dashboardService.stats(u.tenantId);
  }
}
