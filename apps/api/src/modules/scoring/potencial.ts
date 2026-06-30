/**
 * Deriva o "potencial" 0..100 a partir dos únicos sinais presentes na base:
 * Porte + Capital Social, penalizado por situação cadastral. Heurística
 * transparente e recomputável; o vendedor pode sobrescrever (PATCH).
 */
export function derivePotencial(input: {
  porte?: string | null;
  capitalSocial?: number | null;
  situacao?: string | null;
}): number {
  const porte = (input.porte ?? '').toUpperCase();
  let base: number;
  if (porte.includes('DEMAIS')) base = 80;
  else if (porte.includes('PEQUENO')) base = 60;
  else if (porte.includes('MICRO')) base = 35;
  else base = 45;

  // Bônus log do capital social (até +20). R$1M ~ +13; R$50M ~ +20.
  const cap = Number(input.capitalSocial ?? 0);
  const bonus = cap > 0 ? Math.min(20, Math.log10(cap + 1) * 3) : 0;

  let score = base + bonus;

  const situacao = (input.situacao ?? '').toUpperCase();
  if (situacao && situacao !== 'ATIVA') score *= 0.5;

  return Math.max(0, Math.min(100, Math.round(score)));
}
