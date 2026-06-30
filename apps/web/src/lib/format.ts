export const brl = (n: number | null | undefined): string =>
  n == null
    ? '—'
    : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const num = (n: number | null | undefined): string =>
  n == null ? '—' : n.toLocaleString('pt-BR');

export const km = (n: number | null | undefined): string => (n == null ? '—' : `${n} km`);

export function scoreColor(score: number): string {
  if (score >= 75) return 'bg-score-alto';
  if (score >= 50) return 'bg-score-medio';
  return 'bg-score-baixo';
}
