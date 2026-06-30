# API (NestJS) — imagem de produção.
# Build a partir da RAIZ do monorepo:
#   docker build -f apps/api/Dockerfile -t mapeando-api .
FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# Ferramentas para compilar o binding nativo do argon2
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Manifestos primeiro (cache de dependências)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
# Dados necessários em runtime (gazetteer) e para o import (planilha)
COPY infra/data ./infra/data
COPY clientes-autron.xlsx ./clientes-autron.xlsx

RUN pnpm install --frozen-lockfile

ENV NODE_ENV=production
ENV API_PORT=3333
EXPOSE 3333

WORKDIR /app/apps/api
# tsx roda o TypeScript diretamente (ver ADR 0003)
CMD ["pnpm", "start"]
