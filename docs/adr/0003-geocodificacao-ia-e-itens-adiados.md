# ADR 0003 — Geocodificação, IA e itens adiados

- Status: aceito
- Data: 2026-06-30

## Contexto
A base (8.887 registros) não tem lat/lng, histórico de compra, faturamento nem
prospects. O MVP precisa funcionar rápido e ser honesto sobre dados estimados.

## Decisão
- **Geocodificação em 2 fases**: Fase 0 instantânea (centróide do município via
  gazetteer IBGE versionado) garante mapa/raio/score na hora; Fase 1 refina por
  endereço via Nominatim (rate-limited, cache, resumível) em background.
- **Sinais derivados/editáveis**: `potencial` derivado de Porte+Capital (heurística
  transparente); `segmento` do CNAE; última visita/faturamento nuláveis e
  editáveis. Dados de demonstração só atrás da flag `--demo` no seed.
- **Score explicável** com motivos em pt-BR exibidos ao usuário (confiança).
- **IA Claude** com tool-use: as ferramentas batem no nosso DB/OSRM e retornam
  top-N; a IA nunca recebe a base inteira. Chat via SSE.
- **Rota**: OSRM `/trip` (TSP) com fallback vizinho-mais-próximo + Haversine.
- **Pedágio** é estimativa por km (OSRM não fornece) — sinalizado na UI.

## Itens do blueprint adiados (aceitos, fase futura)
MFA e login social (OIDC); observabilidade completa (Prometheus/Grafana/Sentry);
webhooks assinados / API-first p/ terceiros; app mobile (Expo); backups/DR;
compilação da API para JS (hoje roda via tsx) e ESLint/SAST/SCA na CI.

## Consequências
- App utilizável imediatamente, mesmo sem OSRM/Nominatim/chave de IA.
- ROI/receita dependem de dados estimados enquanto não houver integração de
  CRM/ERP — comunicados como estimativa.
