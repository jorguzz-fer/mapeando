import { Body, Controller, Get, Post, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { type SessionUser, loginRequestSchema } from '@mapeando/shared';
import { AuthGuard } from '../../common/auth.guard.js';
import { CurrentUser } from '../../common/current-user.decorator.js';
import { SESSION_COOKIE, cookieOptions, encodeSession } from '../../common/session.js';
import { parse } from '../../common/validate.js';
import { authService } from './auth.service.js';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  @Post('login')
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<SessionUser> {
    const { email, senha } = parse(loginRequestSchema, body);
    const user = await authService.login(email, senha);
    if (!user) throw new UnauthorizedException('E-mail ou senha inválidos');
    reply.setCookie(SESSION_COOKIE, encodeSession(user), cookieOptions);
    return user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) reply: FastifyReply): { ok: true } {
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: SessionUser): SessionUser {
    return user;
  }
}
