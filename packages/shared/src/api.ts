import { z } from 'zod';
import { origemSchema, papelSchema, situacaoSchema, type Client, type Seller } from './domain.js';
import type { GeoJsonLineString } from './geo.js';
import type { ScoreResult } from './scoring.js';

// ── Auth ────────────────────────────────────────────────────────────
export const loginRequestSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export interface SessionUser {
  id: string;
  nome: string;
  email: string;
  papel: z.infer<typeof papelSchema>;
  tenantId: string;
  tenantNome: string;
}

// ── Clients: list/filter ────────────────────────────────────────────
export const clientsQuerySchema = z.object({
  q: z.string().trim().optional(),
  uf: z.string().length(2).optional(),
  municipio: z.string().optional(),
  origem: origemSchema.optional(),
  situacao: situacaoSchema.optional(),
  cnae: z.string().optional(),
  minPotencial: z.coerce.number().min(0).max(100).optional(),
  semVisitaDias: z.coerce.number().min(0).optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(200).default(50),
  sort: z.enum(['potencial', 'nome', 'ultimaVisita']).default('potencial'),
});
export type ClientsQuery = z.infer<typeof clientsQuerySchema>;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Clients: nearby (busca por raio) ────────────────────────────────
export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  raioKm: z.coerce.number().min(1).max(500).default(50),
  origem: origemSchema.optional(),
  situacao: situacaoSchema.optional(),
  apenasAtivas: z.coerce.boolean().default(true),
  limit: z.coerce.number().min(1).max(500).default(100),
});
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;

export interface NearbyClient extends Client {
  distanciaM: number;
}

// ── Client: edição ──────────────────────────────────────────────────
export const patchClientSchema = z.object({
  ultimaVisita: z.string().date().nullable().optional(),
  ultimaCompra: z.string().date().nullable().optional(),
  faturamento: z.number().nonnegative().nullable().optional(),
  potencial: z.number().min(0).max(100).optional(),
  consultorId: z.string().uuid().nullable().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
export type PatchClient = z.infer<typeof patchClientSchema>;

// ── Dashboard ───────────────────────────────────────────────────────
export interface DashboardStats {
  total: number;
  porOrigem: Record<string, number>;
  porSituacao: Record<string, number>;
  porUf: { uf: string; total: number }[];
  topMunicipios: { municipio: string; uf: string; total: number }[];
  geocodificacao: { rooftopOuRua: number; cidade: number; semGeo: number; percentPreciso: number };
  semVisita: { nunca: number; mais180d: number; entre90e180d: number };
}

// ── Trips ───────────────────────────────────────────────────────────
export const createTripSchema = z.object({
  titulo: z.string().min(1).optional(),
  origemLabel: z.string().min(1),
  origemLat: z.number(),
  origemLng: z.number(),
  data: z.string().date().optional(),
  horaSaida: z.string().optional(),
  pernoite: z.boolean().default(false),
});
export type CreateTrip = z.infer<typeof createTripSchema>;

export const planTripSchema = z.object({
  candidateIds: z.array(z.string().uuid()).optional(),
  autoSelect: z
    .object({
      raioKm: z.number().min(1).max(500).default(50),
      topN: z.number().min(1).max(25).default(8),
    })
    .optional(),
  returnToOrigin: z.boolean().default(true),
});
export type PlanTrip = z.infer<typeof planTripSchema>;

export interface CostBreakdown {
  distanciaKm: number;
  duracaoMin: number;
  combustivel: number;
  pedagio: number; // estimativa
  alimentacao: number;
  hotel: number;
  custoTempo: number;
  custoTotal: number;
  receitaEstimada: number;
  roi: number; // (receita - custo) / custo
  custoPorVisita: number;
}

export interface TripStopView {
  id: string;
  clientId: string;
  nome: string;
  municipio: string | null;
  uf: string | null;
  lat: number | null;
  lng: number | null;
  seq: number;
  score: number;
  scoreReasons: string[];
  legDistanciaKm: number | null;
  legDuracaoMin: number | null;
  chegadaEta: string | null;
  telefone: string | null;
}

export interface TripView {
  id: string;
  titulo: string;
  mode: 'visita' | 'missao';
  status: string;
  origemLabel: string;
  origemLat: number;
  origemLng: number;
  stops: TripStopView[];
  routeGeometry: GeoJsonLineString | null;
  custo: CostBreakdown | null;
}

// ── IA ──────────────────────────────────────────────────────────────
export const chatRequestSchema = z.object({
  mensagem: z.string().min(1),
  historico: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .default([]),
  contexto: z
    .object({ cidade: z.string().optional(), lat: z.number().optional(), lng: z.number().optional() })
    .optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const missaoRequestSchema = z.object({
  pedido: z.string().min(1), // "2 dias livres, R$500 mil no interior de SP"
});
export type MissaoRequest = z.infer<typeof missaoRequestSchema>;

export const whatsappRequestSchema = z.object({
  clientId: z.string().uuid(),
  cidade: z.string(),
  data: z.string().optional(),
  hora: z.string().optional(),
});
export type WhatsappRequest = z.infer<typeof whatsappRequestSchema>;

export interface WhatsappMessage {
  texto: string;
  telefone: string | null;
  link: string | null; // wa.me
}

// Reexports usados por handlers/clientes:
export type { Client, Seller, ScoreResult };
