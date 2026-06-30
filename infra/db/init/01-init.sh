#!/bin/bash
# Inicialização do banco (docker-compose / Coolify).
# POSTGRES_USER (= mapeando_admin) é superuser (BYPASSRLS) p/ scripts/migrations.
# Criamos o role da APLICAÇÃO `mapeando` (NOSUPERUSER/NOBYPASSRLS) para o RLS
# isolar por tenant. A senha vem de APP_DB_PASSWORD (default 'mapeando' em dev).
set -e

APP_PASS="${APP_DB_PASSWORD:-mapeando}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE EXTENSION IF NOT EXISTS postgis;
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE EXTENSION IF NOT EXISTS unaccent;

  DO \$\$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mapeando') THEN
      CREATE ROLE mapeando LOGIN PASSWORD '${APP_PASS}' NOSUPERUSER NOBYPASSRLS NOCREATEDB;
    ELSE
      ALTER ROLE mapeando WITH PASSWORD '${APP_PASS}';
    END IF;
  END \$\$;

  GRANT ALL ON SCHEMA public TO mapeando;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mapeando;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mapeando;
EOSQL
