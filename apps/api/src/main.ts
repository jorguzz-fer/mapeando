import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import fastifyCookie from '@fastify/cookie';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';

async function bootstrap() {
  const logger = new Logger('bootstrap');

  // Aplica migrations pendentes no boot (idempotente) — facilita o deploy.
  // RUN_MIGRATIONS_ON_BOOT=false desliga (ex.: múltiplas réplicas).
  if (process.env.RUN_MIGRATIONS_ON_BOOT !== 'false') {
    try {
      const applied = await runMigrations();
      if (applied.length) logger.log(`migrations aplicadas: ${applied.join(', ')}`);
    } catch (err) {
      logger.warn(`migrations não aplicadas no boot: ${(err as Error).message}`);
    }
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
    { bufferLogs: false },
  );

  await app.register(fastifyCookie, { secret: env.SESSION_SECRET });
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });

  const config = new DocumentBuilder()
    .setTitle('Mapeando API')
    .setDescription('Copiloto de Inteligência Comercial')
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  // Servir o front (SPA) do mesmo container quando WEB_DIST aponta para o build.
  // Assim o deploy é um único Dockerfile: a API entrega /api e o app React.
  // `wildcard: false` registra rotas explícitas por arquivo (sem /* conflitante);
  // o fallback de rotas do SPA é feito pelo SpaController (@Get('*')).
  const webDist = process.env.WEB_DIST;
  if (webDist && existsSync(join(webDist, 'index.html'))) {
    app.useStaticAssets({ root: webDist, prefix: '/', wildcard: false });
    logger.log(`Front servido de ${webDist}`);
  }

  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  logger.log(`Mapeando em http://localhost:${env.API_PORT} (API: /api, docs: /api/docs)`);
  logger.log(`IA: ${env.ANTHROPIC_API_KEY ? 'configurada' : 'desativada (sem ANTHROPIC_API_KEY)'}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Falha ao iniciar API:', err);
  process.exit(1);
});
