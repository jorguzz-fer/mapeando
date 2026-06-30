-- Mapeando — schema inicial (multitenant + PostGIS + RLS)
-- Fonte de verdade do DDL. Extensões já criadas pelo admin (ver migrate.ts).

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Tenants / usuários / vendedores ────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  email       text NOT NULL UNIQUE,
  senha_hash  text NOT NULL,
  papel       text NOT NULL DEFAULT 'vendedor' CHECK (papel IN ('admin','gestor','vendedor')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_tenant_idx ON users(tenant_id);

CREATE TABLE IF NOT EXISTS sellers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  nome          text NOT NULL,
  email         text,
  home_municipio text,
  home_uf       char(2),
  geom          geography(Point, 4326),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sellers_tenant_idx ON sellers(tenant_id);

-- ── Segmentos (CNAE) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS segments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cnae        text NOT NULL,
  descricao   text,
  grupo       text,
  UNIQUE (tenant_id, cnae)
);

-- ── Base de clientes ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  origem          text NOT NULL DEFAULT 'Clientes',
  codigo          text,
  loja            text,
  nome_planilha   text,
  cnpj_cpf        text,
  razao_social    text,
  nome_fantasia   text,
  situacao        text NOT NULL DEFAULT 'DESCONHECIDA',
  cnae            text,
  cnae_descricao  text,
  capital_social  numeric(16,2),
  porte           text NOT NULL DEFAULT 'DESCONHECIDO',
  matriz_filial   text,
  grau_risco      smallint,
  sesmt_provavel  boolean,
  rh_estruturado  boolean,
  email           text,
  telefone1       text,
  telefone2       text,
  logradouro      text,
  numero          text,
  complemento     text,
  bairro          text,
  municipio       text,
  uf              char(2),
  cep             text,
  observacao      text,
  -- derivados / editáveis
  potencial       smallint NOT NULL DEFAULT 0,
  ultima_visita   date,
  ultima_compra   date,
  faturamento     numeric(16,2),
  consultor_id    uuid REFERENCES sellers(id) ON DELETE SET NULL,
  -- geo
  geom            geography(Point, 4326),
  geocode_source  text,
  geocode_quality text NOT NULL DEFAULT 'none',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, origem, codigo, loja)
);
CREATE INDEX IF NOT EXISTS clients_geom_gist ON clients USING gist (geom);
CREATE INDEX IF NOT EXISTS clients_tenant_uf_idx ON clients(tenant_id, uf);
CREATE INDEX IF NOT EXISTS clients_tenant_mun_idx ON clients(tenant_id, municipio);
CREATE INDEX IF NOT EXISTS clients_tenant_origem_idx ON clients(tenant_id, origem);
CREATE INDEX IF NOT EXISTS clients_tenant_situacao_idx ON clients(tenant_id, situacao);
CREATE INDEX IF NOT EXISTS clients_tenant_pot_idx ON clients(tenant_id, potencial DESC);
CREATE INDEX IF NOT EXISTS clients_nome_trgm ON clients USING gin (
  (coalesce(nome_fantasia,'') || ' ' || coalesce(razao_social,'') || ' ' || coalesce(nome_planilha,'')) gin_trgm_ops
);

-- ── Viagens ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  seller_id        uuid REFERENCES sellers(id) ON DELETE SET NULL,
  titulo           text NOT NULL DEFAULT 'Nova viagem',
  mode             text NOT NULL DEFAULT 'visita' CHECK (mode IN ('visita','missao')),
  status           text NOT NULL DEFAULT 'rascunho',
  origem_label     text,
  origem_geom      geography(Point, 4326),
  data_viagem      date,
  hora_saida       text,
  pernoite         boolean NOT NULL DEFAULT false,
  distancia_m      double precision,
  duracao_s        double precision,
  custo_total      numeric(16,2),
  receita_estimada numeric(16,2),
  roi              double precision,
  custo_json       jsonb,
  route_geometry   jsonb,
  params           jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trips_tenant_idx ON trips(tenant_id);

CREATE TABLE IF NOT EXISTS trip_stops (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trip_id          uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  client_id        uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  seq              smallint NOT NULL DEFAULT 0,
  score            smallint NOT NULL DEFAULT 0,
  score_reasons    jsonb,
  leg_distance_m   double precision,
  leg_duration_s   double precision,
  arrival_eta      text,
  UNIQUE (trip_id, client_id)
);
CREATE INDEX IF NOT EXISTS trip_stops_trip_idx ON trip_stops(trip_id);

-- ── Cache de geocodificação ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS geocode_cache (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  norm_address  text NOT NULL,
  lat           double precision,
  lng           double precision,
  source        text,
  quality       text,
  raw           jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, norm_address)
);

-- ── Gazetteer IBGE (global, sem tenant / sem RLS) ──────────────────
CREATE TABLE IF NOT EXISTS ibge_municipios (
  codigo_ibge text PRIMARY KEY,
  municipio   text NOT NULL,
  uf          char(2) NOT NULL,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  UNIQUE (municipio, uf)
);
CREATE INDEX IF NOT EXISTS ibge_mun_uf_idx ON ibge_municipios(uf, municipio);
