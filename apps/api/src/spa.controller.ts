import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Controller, Get, NotFoundException, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Fallback do SPA: qualquer rota que não seja /api nem um arquivo estático
 * conhecido retorna o index.html (roteamento client-side do React).
 * Só atua quando WEB_DIST aponta para um build válido.
 */
@ApiExcludeController()
@Controller()
export class SpaController {
  private readonly html: string | null;

  constructor() {
    const dist = process.env.WEB_DIST;
    const index = dist ? join(dist, 'index.html') : null;
    this.html = index && existsSync(index) ? readFileSync(index, 'utf8') : null;
  }

  @Get('*')
  index(@Req() req: FastifyRequest, @Res() reply: FastifyReply): void {
    const url = req.raw.url ?? '/';
    if (url.startsWith('/api') || !this.html) {
      throw new NotFoundException('Not Found');
    }
    reply.type('text/html').send(this.html);
  }
}
