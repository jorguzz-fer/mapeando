# ADR 0001 — Stack e estrutura (monorepo TypeScript)

- Status: aceito
- Data: 2026-06-30

## Contexto
Projeto greenfield (Mapeando) seguindo o `Engineering Blueprint.md` em modo
"fundação enxuta". Precisa de mapa, geocodificação, rotas, IA e multiempresa.

## Decisão
- Monorepo **pnpm** TypeScript end-to-end: `apps/api`, `apps/web`,
  `packages/shared`, `packages/design-tokens`.
- Backend **NestJS** sobre Fastify; **Drizzle** + **PostgreSQL/PostGIS**; Redis
  previsto para cache/filas.
- Frontend **React + Vite + Tailwind** (preset de design tokens), mobile-first/PWA.
- Geo **OpenStreetMap** (MapLibre + Nominatim + OSRM) — sem custo/licença.
- IA **Claude** (`@anthropic-ai/sdk`).

## Consequências
- Contratos em `@mapeando/shared` (Zod) evitam drift back/front.
- NestJS DI por tipo depende de `emitDecoratorMetadata` (não emitido por esbuild/
  tsx). Para rodar em dev (tsx) e build (tsc) sem SWC, **serviços são singletons**
  (sem injeção por construtor); NestJS cuida de HTTP/módulos/Swagger.
- Itens do blueprint adiados em ADR 0003.
