import type Anthropic from '@anthropic-ai/sdk';
import { clientsService } from '../clients/clients.service.js';
import { COST_ASSUMPTIONS, estimateCost, receitaEsperada } from '../routing/cost.js';
import { planRoute } from '../routing/planner.js';
import { scoreClient } from '../scoring/scoring.js';
import { resolveCidade } from '../geo/resolve.js';

export type ToolName =
  | 'resolver_cidade'
  | 'buscar_clientes_proximos'
  | 'obter_cliente'
  | 'planejar_rota'
  | 'estimar_custos';

export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: 'resolver_cidade',
    description:
      'Resolve o nome de uma cidade brasileira para coordenadas (lat/lng). Use antes de buscar clientes próximos quando o usuário menciona uma cidade.',
    input_schema: {
      type: 'object',
      properties: {
        cidade: { type: 'string', description: 'Nome da cidade (ex.: Pederneiras)' },
        uf: { type: 'string', description: 'Sigla do estado (ex.: SP). Opcional.' },
      },
      required: ['cidade'],
    },
  },
  {
    name: 'buscar_clientes_proximos',
    description:
      'Busca os clientes/prospects mais relevantes num raio (km) ao redor de um ponto, já pontuados por importância (Score 0-100) com motivos. Retorna no máximo 20.',
    input_schema: {
      type: 'object',
      properties: {
        lat: { type: 'number' },
        lng: { type: 'number' },
        raioKm: { type: 'number', description: 'Raio em km (padrão 50)' },
        limite: { type: 'number', description: 'Máx. de resultados (padrão 12, teto 20)' },
      },
      required: ['lat', 'lng'],
    },
  },
  {
    name: 'obter_cliente',
    description: 'Detalha um cliente pelo id (telefone, segmento, potencial, última visita).',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'planejar_rota',
    description:
      'Calcula a melhor sequência de visitas (rota otimizada) a partir de uma origem para uma lista de clientes (por id). Retorna distância, duração e ordem.',
    input_schema: {
      type: 'object',
      properties: {
        origemLat: { type: 'number' },
        origemLng: { type: 'number' },
        clienteIds: { type: 'array', items: { type: 'string' } },
        voltarOrigem: { type: 'boolean' },
      },
      required: ['origemLat', 'origemLng', 'clienteIds'],
    },
  },
  {
    name: 'estimar_custos',
    description:
      'Estima custos (combustível, pedágio, tempo, hotel), receita potencial e ROI de uma viagem a partir de distância (km), duração (min), nº de visitas e pernoite.',
    input_schema: {
      type: 'object',
      properties: {
        distanciaKm: { type: 'number' },
        duracaoMin: { type: 'number' },
        nVisitas: { type: 'number' },
        pernoite: { type: 'boolean' },
        receitaEstimada: { type: 'number', description: 'Opcional; se ausente, usa o potencial.' },
      },
      required: ['distanciaKm', 'duracaoMin', 'nVisitas'],
    },
  },
];

type Args = Record<string, any>;

/** Executa a ferramenta e devolve um objeto serializável (vira tool_result). */
export async function runTool(tenantId: string, name: string, args: Args): Promise<unknown> {
  switch (name) {
    case 'resolver_cidade': {
      const r = await resolveCidade(args.cidade, args.uf);
      return r ?? { erro: 'cidade não encontrada' };
    }
    case 'buscar_clientes_proximos': {
      const raioKm = args.raioKm ?? 50;
      const limite = Math.min(20, args.limite ?? 12);
      const nearby = await clientsService.nearby(tenantId, {
        lat: args.lat,
        lng: args.lng,
        raioKm,
        apenasAtivas: true,
        limit: 100,
      });
      const scored = nearby
        .map((c) => {
          const s = scoreClient(
            {
              potencial: c.potencial,
              diasSemVisita: c.diasSemVisita,
              faturamento: c.faturamento,
              ultimaCompra: c.ultimaCompra,
              situacao: c.situacao,
              distanciaM: c.distanciaM,
            },
            { hasRouteContext: true, maxDistanceM: raioKm * 1000 },
          );
          return {
            id: c.id,
            nome: c.nome,
            municipio: c.endereco.municipio,
            uf: c.endereco.uf,
            segmento: c.segmento,
            potencial: c.potencial,
            distanciaKm: Math.round(c.distanciaM / 100) / 10,
            score: s.score,
            motivos: s.reasons,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limite);
      return { total: nearby.length, clientes: scored };
    }
    case 'obter_cliente': {
      const c = await clientsService.get(tenantId, args.id);
      return c ?? { erro: 'cliente não encontrado' };
    }
    case 'planejar_rota': {
      const clientes = await Promise.all(
        (args.clienteIds as string[]).map((id) => clientsService.get(tenantId, id)),
      );
      const pts = clientes
        .filter((c): c is NonNullable<typeof c> => !!c && c.lat != null && c.lng != null)
        .map((c) => ({ id: c.id, nome: c.nome, lat: c.lat!, lng: c.lng! }));
      const route = await planRoute(
        { lat: args.origemLat, lng: args.origemLng },
        pts.map((p) => ({ lat: p.lat, lng: p.lng })),
        args.voltarOrigem ?? true,
      );
      return {
        distanciaKm: Math.round(route.totalDistanceM / 100) / 10,
        duracaoMin: Math.round(route.totalDurationS / 60),
        ordem: route.order.map((i) => pts[i]?.nome),
        fonte: route.source,
      };
    }
    case 'estimar_custos': {
      const receita = args.receitaEstimada ?? args.nVisitas * 8000;
      const cost = estimateCost(
        {
          distanciaM: (args.distanciaKm ?? 0) * 1000,
          duracaoS: (args.duracaoMin ?? 0) * 60,
          nVisitas: args.nVisitas ?? 0,
          pernoite: args.pernoite ?? false,
          receitaEstimada: receita,
        },
        COST_ASSUMPTIONS,
      );
      return cost;
    }
    default:
      return { erro: `ferramenta desconhecida: ${name}` };
  }
}

export { receitaEsperada };
