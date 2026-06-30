# Web (React/Vite) — build estático servido por nginx, que também faz proxy de
# /api para o serviço da API (mesma origem → cookies/CORS simples).
# Build a partir da RAIZ do monorepo:
#   docker build -f apps/web/Dockerfile -t mapeando-web .
FROM node:22-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile
# VITE_MAP_STYLE_URL é opcional (basemap externo). Sem ele, mapa usa fundo liso.
ARG VITE_MAP_STYLE_URL=""
ENV VITE_MAP_STYLE_URL=$VITE_MAP_STYLE_URL
RUN pnpm --filter @mapeando/web build

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
