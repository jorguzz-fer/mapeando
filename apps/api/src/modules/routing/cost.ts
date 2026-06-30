import type { CostBreakdown } from '@mapeando/shared';

/** Premissas de custo (editáveis no front futuramente). */
export const COST_ASSUMPTIONS = {
  consumoKmL: 10, // km por litro
  precoCombustivel: 5.9, // R$/litro
  pedagioPorKm: 0.12, // R$/km (estimativa — OSRM não traz pedágio)
  custoHora: 60, // R$/h do vendedor
  tempoVisitaMin: 45, // min por visita
  alimentacaoDia: 60, // R$/dia
  hotelDiaria: 250, // R$ se pernoite
};

export interface CostInput {
  distanciaM: number;
  duracaoS: number;
  nVisitas: number;
  pernoite: boolean;
  receitaEstimada: number;
}

export function estimateCost(input: CostInput, a = COST_ASSUMPTIONS): CostBreakdown {
  const km = input.distanciaM / 1000;
  const tempoDirecaoMin = input.duracaoS / 60;
  const tempoVisitasMin = input.nVisitas * a.tempoVisitaMin;
  const totalMin = tempoDirecaoMin + tempoVisitasMin;
  const horas = totalMin / 60;

  const combustivel = (km / a.consumoKmL) * a.precoCombustivel;
  const pedagio = km * a.pedagioPorKm;
  const custoTempo = horas * a.custoHora;
  const alimentacao = a.alimentacaoDia * (input.pernoite ? 2 : 1);
  const hotel = input.pernoite ? a.hotelDiaria : 0;
  const custoTotal = combustivel + pedagio + custoTempo + alimentacao + hotel;
  const roi = custoTotal > 0 ? (input.receitaEstimada - custoTotal) / custoTotal : 0;

  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    distanciaKm: round(km),
    duracaoMin: Math.round(totalMin),
    combustivel: round(combustivel),
    pedagio: round(pedagio),
    alimentacao: round(alimentacao),
    hotel: round(hotel),
    custoTempo: round(custoTempo),
    custoTotal: round(custoTotal),
    receitaEstimada: round(input.receitaEstimada),
    roi: round(roi),
    custoPorVisita: input.nVisitas ? round(custoTotal / input.nVisitas) : 0,
  };
}

/**
 * Receita esperada de um cliente: usa faturamento informado; senão estima um
 * ticket a partir do potencial (proxy). Mantém o ROI plausível mesmo sem dados.
 */
export function receitaEsperada(c: { faturamento: number | null; potencial: number }): number {
  if (c.faturamento != null && c.faturamento > 0) return c.faturamento * 0.05; // 5% do fat. anual
  return c.potencial * 200; // potencial 80 → R$16k de oportunidade estimada
}
