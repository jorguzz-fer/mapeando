/**
 * Modelo de dados em TypeScript (Drizzle) — espelha as migrations SQL.
 * O DDL (PostGIS, GIST, RLS) vive nas migrations SQL (controle fino, exigido
 * pelo PostGIS/RLS — ver docs/adr/0002). Aqui ficam os tipos para queries
 * tipadas; consultas geográficas usam `sql` cru sobre estes nomes.
 */
import { customType } from 'drizzle-orm/pg-core';
import {
  boolean,
  char,
  date,
  doublePrecision,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/** geography(Point,4326) — manipulado via funções PostGIS no SQL. */
export const geography = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geography(Point,4326)';
  },
});

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  senhaHash: text('senha_hash').notNull(),
  papel: text('papel').notNull().default('vendedor'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sellers = pgTable('sellers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id'),
  nome: text('nome').notNull(),
  email: text('email'),
  homeMunicipio: text('home_municipio'),
  homeUf: char('home_uf', { length: 2 }),
  geom: geography('geom'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const segments = pgTable('segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  cnae: text('cnae').notNull(),
  descricao: text('descricao'),
  grupo: text('grupo'),
});

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  origem: text('origem').notNull().default('Clientes'),
  codigo: text('codigo'),
  loja: text('loja'),
  nomePlanilha: text('nome_planilha'),
  cnpjCpf: text('cnpj_cpf'),
  razaoSocial: text('razao_social'),
  nomeFantasia: text('nome_fantasia'),
  situacao: text('situacao').notNull().default('DESCONHECIDA'),
  cnae: text('cnae'),
  cnaeDescricao: text('cnae_descricao'),
  capitalSocial: numeric('capital_social'),
  porte: text('porte').notNull().default('DESCONHECIDO'),
  matrizFilial: text('matriz_filial'),
  grauRisco: smallint('grau_risco'),
  sesmtProvavel: boolean('sesmt_provavel'),
  rhEstruturado: boolean('rh_estruturado'),
  email: text('email'),
  telefone1: text('telefone1'),
  telefone2: text('telefone2'),
  logradouro: text('logradouro'),
  numero: text('numero'),
  complemento: text('complemento'),
  bairro: text('bairro'),
  municipio: text('municipio'),
  uf: char('uf', { length: 2 }),
  cep: text('cep'),
  observacao: text('observacao'),
  potencial: smallint('potencial').notNull().default(0),
  ultimaVisita: date('ultima_visita'),
  ultimaCompra: date('ultima_compra'),
  faturamento: numeric('faturamento'),
  consultorId: uuid('consultor_id'),
  geom: geography('geom'),
  geocodeSource: text('geocode_source'),
  geocodeQuality: text('geocode_quality').notNull().default('none'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  sellerId: uuid('seller_id'),
  titulo: text('titulo').notNull().default('Nova viagem'),
  mode: text('mode').notNull().default('visita'),
  status: text('status').notNull().default('rascunho'),
  origemLabel: text('origem_label'),
  origemGeom: geography('origem_geom'),
  dataViagem: date('data_viagem'),
  horaSaida: text('hora_saida'),
  pernoite: boolean('pernoite').notNull().default(false),
  distanciaM: doublePrecision('distancia_m'),
  duracaoS: doublePrecision('duracao_s'),
  custoTotal: numeric('custo_total'),
  receitaEstimada: numeric('receita_estimada'),
  roi: doublePrecision('roi'),
  custoJson: jsonb('custo_json'),
  routeGeometry: jsonb('route_geometry'),
  params: jsonb('params'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tripStops = pgTable('trip_stops', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  tripId: uuid('trip_id').notNull(),
  clientId: uuid('client_id').notNull(),
  seq: smallint('seq').notNull().default(0),
  score: smallint('score').notNull().default(0),
  scoreReasons: jsonb('score_reasons'),
  legDistanceM: doublePrecision('leg_distance_m'),
  legDurationS: doublePrecision('leg_duration_s'),
  arrivalEta: text('arrival_eta'),
});

export const geocodeCache = pgTable('geocode_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  normAddress: text('norm_address').notNull(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  source: text('source'),
  quality: text('quality'),
  raw: jsonb('raw'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const ibgeMunicipios = pgTable('ibge_municipios', {
  codigoIbge: text('codigo_ibge').primaryKey(),
  municipio: text('municipio').notNull(),
  uf: char('uf', { length: 2 }).notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
});
