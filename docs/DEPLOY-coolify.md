# Deploy no Coolify (VPS)

O Mapeando sobe como **um único recurso Docker Compose** no Coolify. O compose
já inclui tudo: banco (PostGIS), Redis, API e Web. Você expõe publicamente
apenas o **web** (que faz proxy de `/api` para a API — mesma origem, sem CORS).

## Pré-requisitos na VPS
- Coolify instalado e um **Project** criado.
- Um domínio/subdomínio apontando para a VPS (ex.: `mapeando.seudominio.com.br`).
- O repositório `jorguzz-fer/mapeando` conectado ao Coolify (GitHub App ou deploy key).

## Recursos (o que o Coolify vai criar)
Tudo a partir do compose — você **não** precisa criar bancos separados à mão:

| Serviço | Imagem/Build | Público? | Função |
|---|---|---|---|
| `postgis` | `postgis/postgis:16-3.4` | não | Banco + PostGIS (volume `pgdata`) |
| `redis` | `redis:7-alpine` | não | Cache/filas (volume `redisdata`) |
| `api` | build `apps/api/Dockerfile` | não | NestJS (porta 3333) |
| `web` | build `apps/web/Dockerfile` | **sim** | SPA + proxy `/api` (porta 80) |

> OSRM e Nominatim são **opcionais** (a rota tem fallback). Para produção com
> ruas/pedágio reais, suba-os à parte e preencha `OSRM_URL`/`NOMINATIM_URL`.

## Passo a passo

1. **New Resource → Docker Compose** (Public/Private Repository).
   - Repositório: `jorguzz-fer/mapeando`, branch `main`.
   - **Compose file**: `docker-compose.prod.yml`.

2. **Environment Variables** — cole os valores (ver `.env.production.example`):
   ```
   WEB_ORIGIN=https://mapeando.seudominio.com.br
   POSTGRES_ADMIN_PASSWORD=<openssl rand -hex 24>
   APP_DB_PASSWORD=<openssl rand -hex 24>
   SESSION_SECRET=<openssl rand -hex 32>
   ANTHROPIC_API_KEY=sk-ant-...
   ANTHROPIC_MODEL_CHAT=claude-sonnet-4-6
   ANTHROPIC_MODEL_MISSION=claude-opus-4-8
   # opcionais:
   OSRM_URL=
   NOMINATIM_URL=
   ```

3. **Domínio**: no serviço `web`, defina o FQDN (`https://mapeando.seudominio.com.br`).
   O Coolify (Traefik) cuida do TLS/Let's Encrypt. Mantenha `api`, `postgis` e
   `redis` **sem** domínio (internos).

4. **Deploy.** No primeiro boot a API aplica as **migrations** automaticamente
   (idempotente). O PostGIS cria as extensões e o role de app na inicialização.

5. **Carga inicial da base** (uma vez) — abra o terminal do container `api` no
   Coolify (ou `docker exec`) e rode:
   ```bash
   pnpm import            # importa a base + geocode Fase 0 (por município)
   pnpm db:seed -- --demo # cria o usuário e dados de demonstração
   ```
   Login: `daniele@autron.com.br` / `mapeando123` (troque depois).

6. **(Opcional) Geocodificação precisa** em background:
   ```bash
   pnpm geocode -- --uf SP --limit 2000
   ```

## Atualizações
Cada push na `main` → o Coolify rebuilda e re-deploya. As migrations pendentes
são aplicadas no boot. Para desligar isso (ex.: várias réplicas), defina
`RUN_MIGRATIONS_ON_BOOT=false` e rode `pnpm db:migrate` manualmente.

## Notas de produção
- Troque a senha do usuário `daniele` após o primeiro acesso.
- `pgdata`/`redisdata` são volumes persistentes — configure backup do Postgres
  no Coolify (Scheduled Backups).
- Apenas o `web` é público; a superfície exposta é mínima (Blueprint §1/§5).
