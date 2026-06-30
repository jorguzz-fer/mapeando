import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SessionUser } from '@mapeando/shared';
import { env } from '../config/env.js';

export const SESSION_COOKIE = 'mapeando_sess';

function sign(payload: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(payload).digest('base64url');
}

/** Serializa a sessão num cookie assinado (HMAC). */
export function encodeSession(user: SessionUser): string {
  const body = Buffer.from(JSON.stringify(user)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/** Valida assinatura e devolve a sessão, ou null se inválida. */
export function decodeSession(cookie: string | undefined): SessionUser | null {
  if (!cookie) return null;
  const [body, sig] = cookie.split('.');
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionUser;
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 dias
};
