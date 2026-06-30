import { z } from 'zod';
import { geocodeQualitySchema } from './geo.js';

/** Origem do registro na base importada. */
export const origemSchema = z.enum(['Clientes', 'Fornecedores', 'Prospects', 'Leads']);
export type Origem = z.infer<typeof origemSchema>;

/** Situação cadastral (Receita). */
export const situacaoSchema = z.enum([
  'ATIVA',
  'BAIXADA',
  'INAPTA',
  'SUSPENSA',
  'NULA',
  'DESCONHECIDA',
]);
export type Situacao = z.infer<typeof situacaoSchema>;

/** Porte da empresa. */
export const porteSchema = z.enum([
  'MICRO EMPRESA',
  'EMPRESA DE PEQUENO PORTE',
  'DEMAIS',
  'DESCONHECIDO',
]);
export type Porte = z.infer<typeof porteSchema>;

/** Papéis de acesso (RBAC). */
export const papelSchema = z.enum(['admin', 'gestor', 'vendedor']);
export type Papel = z.infer<typeof papelSchema>;

/** Modo da viagem. */
export const tripModeSchema = z.enum(['visita', 'missao']);
export type TripMode = z.infer<typeof tripModeSchema>;

export const tripStatusSchema = z.enum(['rascunho', 'planejada', 'concluida', 'cancelada']);
export type TripStatus = z.infer<typeof tripStatusSchema>;

/** Cliente da base (visão de leitura para o front). */
export interface Client {
  id: string;
  origem: Origem;
  codigo: string | null;
  nome: string; // nome fantasia || razão social || nome da planilha
  razaoSocial: string | null;
  nomeFantasia: string | null;
  cnpjCpf: string | null;
  situacao: Situacao;
  cnae: string | null;
  segmento: string | null;
  capitalSocial: number | null;
  porte: Porte;
  email: string | null;
  telefone1: string | null;
  telefone2: string | null;
  endereco: {
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    municipio: string | null;
    uf: string | null;
    cep: string | null;
  };
  lat: number | null;
  lng: number | null;
  geocodeQuality: z.infer<typeof geocodeQualitySchema>;
  potencial: number; // 0..100 derivado
  ultimaVisita: string | null; // ISO date
  ultimaCompra: string | null; // ISO date
  faturamento: number | null;
  consultorId: string | null;
  diasSemVisita: number | null;
}

export interface Seller {
  id: string;
  nome: string;
  email: string | null;
  homeMunicipio: string | null;
  lat: number | null;
  lng: number | null;
}
