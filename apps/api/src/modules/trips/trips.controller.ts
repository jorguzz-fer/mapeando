import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type SessionUser,
  type TripView,
  createTripSchema,
  planTripSchema,
} from '@mapeando/shared';
import { AuthGuard } from '../../common/auth.guard.js';
import { CurrentUser } from '../../common/current-user.decorator.js';
import { parse } from '../../common/validate.js';
import { tripsService } from './trips.service.js';

@ApiTags('trips')
@Controller('api/trips')
@UseGuards(AuthGuard)
export class TripsController {
  @Post()
  create(@CurrentUser() u: SessionUser, @Body() body: unknown): Promise<{ id: string }> {
    return tripsService.create(u.tenantId, null, parse(createTripSchema, body));
  }

  @Post(':id/plan')
  async plan(
    @CurrentUser() u: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<TripView> {
    const view = await tripsService.plan(u.tenantId, id, parse(planTripSchema, body));
    if (!view) throw new NotFoundException('Viagem não encontrada ou sem origem');
    return view;
  }

  @Get(':id')
  async get(@CurrentUser() u: SessionUser, @Param('id') id: string): Promise<TripView> {
    const view = await tripsService.get(u.tenantId, id);
    if (!view) throw new NotFoundException('Viagem não encontrada');
    return view;
  }
}
