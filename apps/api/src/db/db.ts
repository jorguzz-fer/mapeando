import { AsyncLocalStorage } from 'node:async_hooks';
import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema.js';

// numeric -> number (em vez de string) para colunas de dinheiro/qtd.
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 });
export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

/** Contexto de tenant por request (AsyncLocalStorage). */
const tenantStore = new AsyncLocalStorage<{ tenantId: string }>();

export function getCurrentTenantId(): string | null {
  return tenantStore.getStore()?.tenantId ?? null;
}

/**
 * Executa `fn` dentro de uma transação com `SET LOCAL app.current_tenant`,
 * para que as políticas RLS isolem por tenant. Toda consulta de domínio passa
 * por aqui (recebe um `tx` Drizzle com o tenant aplicado).
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: NodePgDatabase<typeof schema>) => Promise<T>,
): Promise<T> {
  return tenantStore.run({ tenantId }, () =>
    db.transaction(async (tx) => {
      // set_config é parametrizável (set local não aceita parâmetro).
      await tx.execute(sql`select set_config('app.current_tenant', ${tenantId}, true)`);
      return fn(tx);
    }),
  );
}

/** Atalho: SELECT cru parametrizado dentro do tenant atual. Retorna linhas. */
export async function queryInTenant<R = Record<string, unknown>>(
  tenantId: string,
  query: ReturnType<typeof sql>,
): Promise<R[]> {
  return withTenant(tenantId, async (tx) => {
    const res = await tx.execute(query);
    return res.rows as R[];
  });
}

export { sql };
