# 📍 Mapeando — Copiloto de Inteligência Comercial

Plataforma de IA que transforma viagens comerciais em oportunidades de negócio.
O vendedor diz *"tenho uma visita marcada em Pederneiras"* e o Mapeando responde:
quem mais vale visitar, a melhor rota, quanto vai gastar, o retorno esperado, e
ainda monta **missões comerciais** inteiras a partir de um objetivo em linguagem
natural (*"2 dias livres, gerar R$500 mil no interior de SP"*).

> Primeiro cliente: **Autron** (Daniele). Produto é multiempresa (SaaS).

## Arquitetura

Monorepo **pnpm** TypeScript end-to-end, seguindo o `Engineering Blueprint.md`.

| Camada | Tecnologia |
|---|---|
| Backend | NestJS (Fastify) + Drizzle + **PostgreSQL/PostGIS** + Redis |
| Frontend | React + Vite + Tailwind (design tokens) + **MapLibre** (PWA, mobile-first) |
| Geo | OpenStreetMap: Nominatim (geocoding) + OSRM (rota/TSP) + gazetteer IBGE |
| IA | Claude (`@anthropic-ai/sdk`) com tool-use + streaming |
| Multitenancy | `tenant_id` + **RLS** no Postgres (isolamento por empresa) |

```
apps/api    # NestJS — módulos auth, clients, dashboard, trips, scoring, routing, geo, ai
apps/web    # React SPA
packages/shared          # contratos/tipos (Zod) compartilhados
packages/design-tokens   # tokens + preset Tailwind
infra/      # docker-compose + gazetteer IBGE
docs/adr/   # decisões arquiteturais
```

## Como rodar (dev)

Pré-requisitos: **Node 22+**, **pnpm 10+**, e PostgreSQL 16 + PostGIS
(via Docker recomendado).

```bash
# 1) Dependências
pnpm install

# 2) Banco (PostGIS + Redis) via Docker
docker compose -f infra/docker-compose.yml up -d

# 3) Configuração
cp .env.example .env          # ajuste ANTHROPIC_API_KEY p/ habilitar a IA

# 4) Migrations (schema + RLS) e carga da base
pnpm db:migrate
pnpm import                   # importa clientes-autron.xlsx + geocode Fase 0 (cidade)
pnpm db:seed -- --demo        # cria usuário e sinais de demonstração

# 5) Subir API + Web
pnpm dev
# API:  http://localhost:3333  (docs: /api/docs)
# Web:  http://localhost:5173
```

Login de demonstração: **daniele@autron.com.br** / **mapeando123**

### Geocodificação precisa (opcional, em background)

A Fase 0 posiciona todos por município (instantâneo). Para precisão de rua:

```bash
pnpm geocode -- --uf SP --limit 1000   # Nominatim público (1 req/s) ou self-hosted
```

### IA (Claude)

Defina `ANTHROPIC_API_KEY` no `.env`. Sem a chave, o planejamento, o Score, a
rota e os custos funcionam normalmente; apenas o chat e a Missão pedem a chave.

## Funcionalidades

- **Dashboard** — base toda no mapa do Brasil (clusters), cobertura, top cidades.
- **Planejar Viagem** — destino + raio → **Score 0-100 explicável** (potencial,
  recência de visita, faturamento, proximidade, situação) → **rota otimizada**
  (OSRM/TSP, com fallback) → **custo + receita + retorno** → WhatsApp por cliente.
- **Missão Comercial** — objetivo em linguagem natural → roteiro completo via IA.
- **Copiloto** — chat com tool-use que consulta a base real e sugere visitas.

## Qualidade

```bash
pnpm typecheck    # tsc em todos os pacotes
pnpm test         # testes (Score) — Vitest
pnpm build        # build de todos os pacotes
```

Decisões e itens adiados estão em [`docs/adr/`](docs/adr/).
