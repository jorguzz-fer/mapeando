import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/auth.guard.js';
import { type ResolvedCity, resolveCidade } from './resolve.js';

@ApiTags('geo')
@Controller('api/geo')
@UseGuards(AuthGuard)
export class GeoController {
  @Get('resolve')
  async resolve(@Query('cidade') cidade: string, @Query('uf') uf?: string): Promise<ResolvedCity> {
    if (!cidade) throw new BadRequestException('Informe a cidade');
    const r = await resolveCidade(cidade, uf);
    if (!r) throw new BadRequestException('Cidade não encontrada');
    return r;
  }
}
