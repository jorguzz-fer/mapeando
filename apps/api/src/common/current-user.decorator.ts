import { type ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { SessionUser } from '@mapeando/shared';
import type { AuthedRequest } from './auth.guard.js';

/** Injeta o SessionUser autenticado no handler. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): SessionUser => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest>();
  if (!req.user) throw new Error('CurrentUser usado sem AuthGuard');
  return req.user;
});
