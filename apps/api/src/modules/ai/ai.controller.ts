import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import {
  type SessionUser,
  type WhatsappMessage,
  chatRequestSchema,
  missaoRequestSchema,
  whatsappRequestSchema,
} from '@mapeando/shared';
import { AuthGuard } from '../../common/auth.guard.js';
import { CurrentUser } from '../../common/current-user.decorator.js';
import { parse } from '../../common/validate.js';
import { runCopilot } from './copilot.js';
import { runMission } from './mission.js';
import { gerarWhatsapp } from './whatsapp.js';

@ApiTags('ai')
@Controller('api/ai')
@UseGuards(AuthGuard)
export class AiController {
  @Post('chat')
  async chat(
    @CurrentUser() u: SessionUser,
    @Body() body: unknown,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const req = parse(chatRequestSchema, body);
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    const send = (e: unknown) => reply.raw.write(`data: ${JSON.stringify(e)}\n\n`);
    await runCopilot(
      {
        tenantId: u.tenantId,
        empresa: u.tenantNome,
        historico: req.historico,
        mensagem: req.mensagem,
        contexto: req.contexto,
      },
      send,
    );
    reply.raw.end();
  }

  @Post('missao')
  async missao(@CurrentUser() u: SessionUser, @Body() body: unknown): Promise<{ texto: string }> {
    const req = parse(missaoRequestSchema, body);
    return runMission({ tenantId: u.tenantId, empresa: u.tenantNome, pedido: req.pedido });
  }

  @Post('whatsapp')
  whatsapp(@CurrentUser() u: SessionUser, @Body() body: unknown): Promise<WhatsappMessage> {
    return gerarWhatsapp(u.tenantId, parse(whatsappRequestSchema, body));
  }
}
