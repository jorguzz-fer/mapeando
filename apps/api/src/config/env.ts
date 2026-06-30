import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Carrega .env da raiz do monorepo (subindo a partir deste arquivo).
const here = dirname(fileURLToPath(import.meta.url));
for (const candidate of [
  resolve(process.cwd(), '.env'),
  resolve(here, '../../../../.env'),
  resolve(here, '../../.env'),
]) {
  if (existsSync(candidate)) {
    loadDotenv({ path: candidate });
    break;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(3333),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1),
  DATABASE_ADMIN_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),

  SESSION_SECRET: z.string().min(8).default('dev-session-secret-change-me'),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL_CHAT: z.string().default('claude-sonnet-4-6'),
  ANTHROPIC_MODEL_MISSION: z.string().default('claude-opus-4-8'),

  OSRM_URL: z.string().default('http://localhost:5000'),
  NOMINATIM_URL: z.string().optional(),
  NOMINATIM_USER_AGENT: z.string().default('Mapeando/0.1'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = (() => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Configuração inválida (.env):', parsed.error.flatten().fieldErrors);
    throw new Error('Variáveis de ambiente inválidas');
  }
  return parsed.data;
})();

export const aiEnabled = (): boolean => Boolean(env.ANTHROPIC_API_KEY);
