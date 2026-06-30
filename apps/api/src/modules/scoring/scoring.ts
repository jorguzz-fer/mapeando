import {
  DEFAULT_SCORE_WEIGHTS,
  type ScoreComponent,
  type ScoreComponentKey,
  type ScoreResult,
} from '@mapeando/shared';

export interface ScorableClient {
  potencial: number; // 0..100
  diasSemVisita: number | null; // null = nunca visitado
  faturamento: number | null;
  ultimaCompra: string | null; // ISO
  situacao: string;
  distanciaM?: number | null; // p/ proximidade (quando há rota/origem)
}

export interface ScoreContext {
  /** Distância de referência p/ normalizar proximidade (m). */
  maxDistanceM?: number;
  /** Há contexto de rota? Se não, o peso de proximidade é redistribuído. */
  hasRouteContext?: boolean;
  weights?: Partial<Record<ScoreComponentKey, number>>;
}

const DIAS_SATURACAO = 180;
const FAT_SATURACAO = 10_000_000; // R$10M ~ valor "compra muito"

export function scoreClient(c: ScorableClient, ctx: ScoreContext = {}): ScoreResult {
  const hasRoute = ctx.hasRouteContext ?? c.distanciaM != null;
  const maxDist = ctx.maxDistanceM ?? 200_000;
  const w = { ...DEFAULT_SCORE_WEIGHTS, ...ctx.weights };

  // Sem contexto de rota, redistribui o peso de proximidade nos demais.
  let effective = { ...w };
  if (!hasRoute) {
    const factor = 100 / (100 - w.proximidade);
    effective = {
      potencial: w.potencial * factor,
      recencia: w.recencia * factor,
      faturamento: w.faturamento * factor,
      situacao: w.situacao * factor,
      proximidade: 0,
    };
  }

  const components: ScoreComponent[] = [];

  // 1) Potencial
  {
    const value = Math.max(0, Math.min(1, c.potencial / 100));
    components.push({
      key: 'potencial',
      value,
      points: effective.potencial * value,
      reason: value >= 0.6 ? 'Alto potencial (porte/capital)' : null,
    });
  }

  // 2) Recência da visita
  {
    let value: number;
    let reason: string | null = null;
    if (c.diasSemVisita == null) {
      value = 1;
      reason = 'Nunca visitado';
    } else {
      value = Math.max(0, Math.min(1, c.diasSemVisita / DIAS_SATURACAO));
      if (c.diasSemVisita >= 90) reason = `Sem visita há ${c.diasSemVisita} dias`;
    }
    components.push({ key: 'recencia', value, points: effective.recencia * value, reason });
  }

  // 3) Faturamento / compra
  {
    let value = 0;
    let reason: string | null = null;
    if (c.faturamento != null && c.faturamento > 0) {
      value = Math.min(1, Math.log10(c.faturamento + 1) / Math.log10(FAT_SATURACAO));
      if (value >= 0.6) reason = 'Compra muito';
    } else if (c.ultimaCompra) {
      value = 0.4; // tem histórico de compra, sem valor informado
    }
    components.push({ key: 'faturamento', value, points: effective.faturamento * value, reason });
  }

  // 4) Proximidade da rota
  if (hasRoute && c.distanciaM != null) {
    const value = Math.max(0, 1 - Math.min(1, c.distanciaM / maxDist));
    const km = Math.round(c.distanciaM / 1000);
    components.push({
      key: 'proximidade',
      value,
      points: effective.proximidade * value,
      reason: c.distanciaM <= 30_000 ? `Pertinho da rota (${km} km)` : null,
    });
  }

  // 5) Situação cadastral
  {
    const s = (c.situacao || '').toUpperCase();
    const value = s === 'ATIVA' ? 1 : s === 'INAPTA' ? 0.3 : s === 'SUSPENSA' ? 0.6 : 0;
    components.push({
      key: 'situacao',
      value,
      points: effective.situacao * value,
      reason: s && s !== 'ATIVA' ? `Situação ${s}` : null,
    });
  }

  const score = Math.max(0, Math.min(100, Math.round(components.reduce((a, c2) => a + c2.points, 0))));
  const reasons = components
    .filter((x) => x.reason)
    .sort((a, b) => b.points - a.points)
    .map((x) => x.reason as string)
    .slice(0, 4);

  return { score, components, reasons };
}
