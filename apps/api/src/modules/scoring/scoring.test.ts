import { describe, expect, it } from 'vitest';
import { derivePotencial } from './potencial.js';
import { scoreClient } from './scoring.js';

describe('derivePotencial', () => {
  it('grande empresa ativa com capital alto pontua alto', () => {
    const p = derivePotencial({ porte: 'DEMAIS', capitalSocial: 5_000_000, situacao: 'ATIVA' });
    expect(p).toBeGreaterThanOrEqual(90);
  });
  it('micro empresa pontua baixo', () => {
    const p = derivePotencial({ porte: 'MICRO EMPRESA', capitalSocial: 50_000, situacao: 'ATIVA' });
    expect(p).toBeLessThan(60);
  });
  it('situação não-ativa reduz pela metade', () => {
    const ativa = derivePotencial({ porte: 'DEMAIS', capitalSocial: 1_000_000, situacao: 'ATIVA' });
    const baixada = derivePotencial({ porte: 'DEMAIS', capitalSocial: 1_000_000, situacao: 'BAIXADA' });
    expect(baixada).toBeLessThan(ativa);
  });
});

describe('scoreClient', () => {
  it('cliente top gera score alto e motivos em pt-BR', () => {
    const r = scoreClient(
      {
        potencial: 95,
        diasSemVisita: 140,
        faturamento: 8_000_000,
        ultimaCompra: '2025-01-01',
        situacao: 'ATIVA',
        distanciaM: 3000,
      },
      { hasRouteContext: true, maxDistanceM: 60_000 },
    );
    expect(r.score).toBeGreaterThan(80);
    expect(r.reasons.join(' ')).toMatch(/Sem visita há 140 dias/);
    expect(r.reasons.some((x) => /potencial/i.test(x))).toBe(true);
  });

  it('nunca visitado vira motivo e maximiza recência', () => {
    const r = scoreClient(
      { potencial: 70, diasSemVisita: null, faturamento: null, ultimaCompra: null, situacao: 'ATIVA' },
      { hasRouteContext: false },
    );
    expect(r.reasons).toContain('Nunca visitado');
  });

  it('situação BAIXADA penaliza e aparece como motivo', () => {
    const r = scoreClient(
      { potencial: 80, diasSemVisita: 10, faturamento: null, ultimaCompra: null, situacao: 'BAIXADA' },
      { hasRouteContext: false },
    );
    expect(r.reasons.some((x) => /BAIXADA/.test(x))).toBe(true);
  });

  it('score sempre entre 0 e 100', () => {
    const r = scoreClient(
      { potencial: 100, diasSemVisita: 9999, faturamento: 1e12, ultimaCompra: null, situacao: 'ATIVA', distanciaM: 0 },
      { hasRouteContext: true, maxDistanceM: 1000 },
    );
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
