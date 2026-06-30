/**
 * Runner de migrations SQL (idempotente). Aplica em ordem os arquivos
 * src/db/migrations/*.sql que ainda não foram registrados em `_migrations`.
 * Roda como o usuário da aplicação (que é dono do schema). Pode rodar via
 * `tsx src/db/migrate.ts`.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { env } from '../config/env.js';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, 'migrations');

async function ensureExtensions(client: pg.Client): Promise<void> {
  // Best-effort: em dev as extensões já existem; em prod o admin cria antes.
  for (const ext of ['postgis', 'pg_trgm']) {
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS ${ext}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[migrate] não pude garantir extensão ${ext}:`, (err as Error).message);
    }
  }
}

export async function runMigrations(connectionString = env.DATABASE_URL): Promise<string[]> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  const applied: string[] = [];
  try {
    await ensureExtensions(client);
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
      if (rows.length > 0) continue;
      const sqlText = readFileSync(join(migrationsDir, file), 'utf8');
      // eslint-disable-next-line no-console
      console.log(`[migrate] aplicando ${file}…`);
      await client.query('BEGIN');
      try {
        await client.query(sqlText);
        await client.query('INSERT INTO _migrations(name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Falha em ${file}: ${(err as Error).message}`);
      }
    }
  } finally {
    await client.end();
  }
  return applied;
}

// Execução direta (CLI)
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then((applied) => {
      // eslint-disable-next-line no-console
      console.log(
        applied.length ? `[migrate] aplicadas: ${applied.join(', ')}` : '[migrate] nada pendente.',
      );
      process.exit(0);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[migrate] erro:', err);
      process.exit(1);
    });
}
