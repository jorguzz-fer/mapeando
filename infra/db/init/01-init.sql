-- Inicialização do banco no docker-compose.
-- O POSTGRES_USER (mapeando_admin) é superuser (BYPASSRLS) — usado por
-- scripts/migrations. Criamos aqui o role da APLICAÇÃO `mapeando`, que é
-- NOSUPERUSER + NOBYPASSRLS para que o RLS realmente isole por tenant.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mapeando') THEN
    CREATE ROLE mapeando LOGIN PASSWORD 'mapeando' NOSUPERUSER NOBYPASSRLS NOCREATEDB;
  END IF;
END $$;

GRANT ALL ON SCHEMA public TO mapeando;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mapeando;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mapeando;
