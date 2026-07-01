# Deploy no Coolify (VPS)

Recomendado: **1 único Dockerfile + deploy do GitHub** — o mesmo padrão dos seus
outros projetos. O `Dockerfile` na raiz builda o front e o serve pela própria API
(mesmo container). No Coolify fica assim:

- **1 Application** (Build Pack: Dockerfile) — o app (front + API).
- **1 PostgreSQL** (recurso gerenciado, imagem PostGIS).
- **1 Redis** (recurso gerenciado).

> Alternativa (tudo num compose): use `docker-compose.prod.yml`. Mas o caminho
> abaixo é o mais simples e “à sua maneira”.

## 1) PostgreSQL (com PostGIS)

New Resource → **Database → PostgreSQL**.
- **Image**: `postgis/postgis:16-3.4` (campo de imagem customizada).
- Anote o usuário/senha (superuser) e o **host interno** (ex.: nome do serviço).

Depois de criar, abra o **terminal do Postgres** (ou use a aba de comando) e rode
**uma vez** — cria extensões e o role de aplicação (não-superuser) que mantém o
**RLS** (isolamento por empresa) funcionando:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE ROLE mapeando LOGIN PASSWORD 'ESCOLHA_UMA_SENHA_FORTE'
  NOSUPERUSER NOBYPASSRLS NOCREATEDB;
GRANT ALL ON SCHEMA public TO mapeando;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mapeando;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mapeando;
```

## 2) Redis

New Resource → **Database → Redis**. Anote o **host interno**.

## 3) Application (o app)

New Resource → **Application** → conecte o repositório `jorguzz-fer/mapeando`
(branch `main`).
- **Build Pack**: `Dockerfile` (o Coolify detecta o `Dockerfile` da raiz).
- **Port (exposed)**: `3333`.
- **Domain**: `https://mapeando.seudominio.com.br` (TLS automático).
- Conecte a Application à **mesma rede** dos recursos Postgres/Redis (Coolify:
  “Connect To Predefined Network” / mesmo Project) para resolver os hosts internos.

**Environment Variables** (ver `.env.production.example`):
```
NODE_ENV=production
API_PORT=3333
WEB_ORIGIN=https://mapeando.seudominio.com.br
DATABASE_URL=postgresql://mapeando:SENHA_APP@<host-postgres>:5432/<db>
DATABASE_ADMIN_URL=postgresql://<super>:<senha>@<host-postgres>:5432/<db>
REDIS_URL=redis://<host-redis>:6379
SESSION_SECRET=<openssl rand -hex 32>
ANTHROPIC_API_KEY=sk-ant-...
```
> `<host-postgres>`/`<host-redis>` são os nomes internos dos recursos no Coolify.

## 4) Deploy + carga inicial

1. **Deploy.** No boot, a API aplica as **migrations** automaticamente (idempotente).
2. **Carga da base** (uma vez) — no **terminal da Application**:
   ```bash
   pnpm import            # importa a base + geocode Fase 0 (por município)
   pnpm db:seed -- --demo # cria o usuário e dados de demonstração
   ```
   Login: `daniele@autron.com.br` / `mapeando123` (troque depois).
3. **(Opcional)** geocodificação precisa em background:
   ```bash
   pnpm geocode -- --uf SP --limit 2000
   ```

## Atualizações
Cada push na `main` → o Coolify rebuilda e re-deploya; migrations pendentes são
aplicadas no boot. Para desligar (várias réplicas): `RUN_MIGRATIONS_ON_BOOT=false`
e rode `pnpm db:migrate` manualmente.

## Notas
- **RLS**: a `DATABASE_URL` **precisa** usar o role `mapeando` (não-superuser).
  Se usar o superuser, o isolamento por empresa não é garantido no banco.
- Troque a senha do usuário `daniele` após o primeiro acesso.
- Configure **backup** do Postgres no Coolify (Scheduled Backups).
- OSRM/Nominatim são opcionais (a rota tem fallback). Suba-os à parte e preencha
  `OSRM_URL`/`NOMINATIM_URL` quando quiser ruas/pedágio reais.
