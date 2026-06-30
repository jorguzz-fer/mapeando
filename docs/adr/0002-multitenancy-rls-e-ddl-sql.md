# ADR 0002 — Multitenancy (RLS) e DDL em SQL

- Status: aceito
- Data: 2026-06-30

## Contexto
O produto é SaaS multiempresa. O blueprint recomenda `tenant_id` + RLS. PostGIS
(geography, GIST) e RLS exigem DDL que ORMs não expressam bem.

## Decisão
- **Multitenancy desde o dia 1**: toda tabela de domínio tem `tenant_id`, com
  **RLS + FORCE** e política `tenant_id = app_current_tenant()`.
- Cada request abre transação e faz `SET LOCAL app.current_tenant` (helper
  `withTenant` + AsyncLocalStorage). O role da app é **NOSUPERUSER/NOBYPASSRLS**.
- **DDL em migrations SQL** (`apps/api/src/db/migrations/*.sql`) como fonte de
  verdade (PostGIS, GIST, RLS, índices trgm). O **schema Drizzle** espelha o
  modelo para queries tipadas; consultas geográficas usam `sql` cru.
- Provisionamento de tenant e cargas em massa usam um role **admin (BYPASSRLS)**
  separado (scripts), nunca o servidor.

## Consequências
- Isolamento defensivo no banco (testado: tenant A não lê B).
- Duas representações (SQL + Drizzle) exigem manter o schema em sincronia.
- `drizzle-kit` não é usado para gerar DDL (RLS/PostGIS); migrations são escritas
  à mão e aplicadas por um runner idempotente.
