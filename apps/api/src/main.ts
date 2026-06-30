import 'reflect-metadata';
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

  // Em dev, aplica migrations pendentes no boot (idempotente).
  if (env.NODE_ENV !== 'production') {
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

  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  logger.log(`Mapeando API em http://localhost:${env.API_PORT} (docs: /api/docs)`);
  logger.log(`IA: ${env.ANTHROPIC_API_KEY ? 'configurada' : 'desativada (sem ANTHROPIC_API_KEY)'}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Falha ao iniciar API:', err);
  process.exit(1);
});
