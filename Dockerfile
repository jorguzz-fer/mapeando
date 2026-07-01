# Mapeando — imagem ÚNICA (front + API no mesmo container).
# Coolify detecta este Dockerfile na raiz e faz o deploy direto do GitHub.
# A API (porta 3333) serve o app React e as rotas /api.
FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia o monorepo (node_modules/dist são ignorados pelo .dockerignore)
COPY . .

RUN pnpm install --frozen-lockfile
# Build do front (gera apps/web/dist)
RUN pnpm --filter @mapeando/web build

ENV NODE_ENV=production
ENV API_PORT=3333
# Faz a API servir o SPA
ENV WEB_DIST=/app/apps/web/dist
EXPOSE 3333

WORKDIR /app/apps/api
CMD ["pnpm", "start"]
