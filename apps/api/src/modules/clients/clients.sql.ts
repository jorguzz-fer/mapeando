import { sql } from 'drizzle-orm';
import type { Client, Origem, Porte, Situacao } from '@mapeando/shared';

/** Colunas padronizadas para montar um Client DTO (inclui lat/lng e dias sem visita). */
export const clientSelect = sql`
  c.id, c.origem, c.codigo, c.razao_social, c.nome_fantasia, c.nome_planilha,
  c.cnpj_cpf, c.situacao, c.cnae, c.cnae_descricao, c.capital_social, c.porte,
  c.email, c.telefone1, c.telefone2,
  c.logradouro, c.numero, c.complemento, c.bairro, c.municipio, c.uf, c.cep,
  c.potencial, c.ultima_visita, c.ultima_compra, c.faturamento, c.consultor_id,
  c.geocode_quality,
  ST_Y(c.geom::geometry) AS lat,
  ST_X(c.geom::geometry) AS lng,
  CASE WHEN c.ultima_visita IS NULL THEN NULL
       ELSE (CURRENT_DATE - c.ultima_visita) END AS dias_sem_visita
`;

export interface ClientRow {
  id: string;
  origem: string;
  codigo: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  nome_planilha: string | null;
  cnpj_cpf: string | null;
  situacao: string;
  cnae: string | null;
  cnae_descricao: string | null;
  capital_social: number | null;
  porte: string;
  email: string | null;
  telefone1: string | null;
  telefone2: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  potencial: number;
  ultima_visita: string | null;
  ultima_compra: string | null;
  faturamento: number | null;
  consultor_id: string | null;
  geocode_quality: string;
  lat: number | null;
  lng: number | null;
  dias_sem_visita: number | null;
}

export function mapClient(r: ClientRow): Client {
  return {
    id: r.id,
    origem: r.origem as Origem,
    codigo: r.codigo,
    nome: r.nome_fantasia || r.razao_social || r.nome_planilha || 'Sem nome',
    razaoSocial: r.razao_social,
    nomeFantasia: r.nome_fantasia,
    cnpjCpf: r.cnpj_cpf,
    situacao: r.situacao as Situacao,
    cnae: r.cnae,
    segmento: r.cnae_descricao,
    capitalSocial: r.capital_social,
    porte: r.porte as Porte,
    email: r.email,
    telefone1: r.telefone1,
    telefone2: r.telefone2,
    endereco: {
      logradouro: r.logradouro,
      numero: r.numero,
      complemento: r.complemento,
      bairro: r.bairro,
      municipio: r.municipio,
      uf: r.uf,
      cep: r.cep,
    },
    lat: r.lat,
    lng: r.lng,
    geocodeQuality: (r.geocode_quality as Client['geocodeQuality']) ?? 'none',
    potencial: r.potencial,
    ultimaVisita: r.ultima_visita,
    ultimaCompra: r.ultima_compra,
    faturamento: r.faturamento,
    consultorId: r.consultor_id,
    diasSemVisita: r.dias_sem_visita,
  };
}
