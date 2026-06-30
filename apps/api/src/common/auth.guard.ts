import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { SessionUser } from '@mapeando/shared';
import { SESSION_COOKIE, decodeSession } from './session.js';

export interface AuthedRequest extends FastifyRequest {
  user?: SessionUser;
  cookies: Record<string, string | undefined>;
}

/** Exige sessão válida; injeta req.user. */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const user = decodeSession(req.cookies?.[SESSION_COOKIE]);
    if (!user) throw new UnauthorizedException('Sessão inválida ou expirada');
    req.user = user;
    return true;
  }
}
