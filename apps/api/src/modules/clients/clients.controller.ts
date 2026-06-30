import { Body, Controller, Get, NotFoundException, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type Client,
  type NearbyClient,
  type Paginated,
  type SessionUser,
  clientsQuerySchema,
  nearbyQuerySchema,
  patchClientSchema,
} from '@mapeando/shared';
import { AuthGuard } from '../../common/auth.guard.js';
import { CurrentUser } from '../../common/current-user.decorator.js';
import { parse } from '../../common/validate.js';
import { clientsService } from './clients.service.js';

@ApiTags('clients')
@Controller('api/clients')
@UseGuards(AuthGuard)
export class ClientsController {
  @Get()
  list(@CurrentUser() u: SessionUser, @Query() query: unknown): Promise<Paginated<Client>> {
    return clientsService.list(u.tenantId, parse(clientsQuerySchema, query));
  }

  @Get('nearby')
  nearby(@CurrentUser() u: SessionUser, @Query() query: unknown): Promise<NearbyClient[]> {
    return clientsService.nearby(u.tenantId, parse(nearbyQuerySchema, query));
  }

  @Get('map-points')
  mapPoints(@CurrentUser() u: SessionUser) {
    return clientsService.mapPoints(u.tenantId);
  }

  @Get(':id')
  async get(@CurrentUser() u: SessionUser, @Param('id') id: string): Promise<Client> {
    const c = await clientsService.get(u.tenantId, id);
    if (!c) throw new NotFoundException('Cliente não encontrado');
    return c;
  }

  @Patch(':id')
  async patch(
    @CurrentUser() u: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<Client> {
    const c = await clientsService.patch(u.tenantId, id, parse(patchClientSchema, body));
    if (!c) throw new NotFoundException('Cliente não encontrado');
    return c;
  }
}
