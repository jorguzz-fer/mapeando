import { z } from 'zod';

/** Chave de cada componente do Score (para tunar pesos e exibir no front). */
export const scoreComponentKeySchema = z.enum([
  'potencial',
  'recencia',
  'faturamento',
  'proximidade',
  'situacao',
]);
export type ScoreComponentKey = z.infer<typeof scoreComponentKeySchema>;

export interface ScoreComponent {
  key: ScoreComponentKey;
  /** Contribuição em pontos para o score final (0..100). */
  points: number;
  /** Valor normalizado 0..1 do sinal. */
  value: number;
  /** Frase explicativa em pt-BR (chip). Null quando não aplicável. */
  reason: string | null;
}

export interface ScoreResult {
  score: number; // 0..100
  components: ScoreComponent[];
  /** Motivos relevantes, já ordenados, prontos para exibir. */
  reasons: string[];
}

/** Pesos padrão (somam 100). Configuráveis no servidor. */
export const DEFAULT_SCORE_WEIGHTS: Record<ScoreComponentKey, number> = {
  potencial: 30,
  recencia: 25,
  faturamento: 20,
  proximidade: 15,
  situacao: 10,
};
