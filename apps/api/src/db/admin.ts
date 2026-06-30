import pg from 'pg';
import { env } from '../config/env.js';

// numeric -> number
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

/**
 * Pool administrativo (BYPASSRLS) para operações cross-tenant: autenticação
 * (lookup de usuário por e-mail) e provisionamento. NÃO usar para dados de
 * domínio do request — esses passam por withTenant() (RLS).
 */
export const adminPool = new pg.Pool({
  connectionString: env.DATABASE_ADMIN_URL ?? env.DATABASE_URL,
  max: 5,
});
