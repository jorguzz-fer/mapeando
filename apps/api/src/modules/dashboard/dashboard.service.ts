import { sql } from 'drizzle-orm';
import type { DashboardStats } from '@mapeando/shared';
import { withTenant } from '../../db/db.js';

export class DashboardService {
  async stats(tenantId: string): Promise<DashboardStats> {
    return withTenant(tenantId, async (tx) => {
      const totalQ = await tx.execute(sql`SELECT count(*)::int n FROM clients`);
      const total = (totalQ.rows[0] as { n: number }).n;

      const origemQ = await tx.execute(
        sql`SELECT origem, count(*)::int n FROM clients GROUP BY origem`,
      );
      const situacaoQ = await tx.execute(
        sql`SELECT situacao, count(*)::int n FROM clients GROUP BY situacao`,
      );
      const ufQ = await tx.execute(
        sql`SELECT uf, count(*)::int n FROM clients WHERE uf IS NOT NULL GROUP BY uf ORDER BY n DESC`,
      );
      const munQ = await tx.execute(
        sql`SELECT municipio, uf, count(*)::int n FROM clients
            WHERE municipio IS NOT NULL GROUP BY municipio, uf ORDER BY n DESC LIMIT 10`,
      );
      const geoQ = await tx.execute(sql`
        SELECT
          count(*) FILTER (WHERE geocode_quality IN ('rooftop','street','cep'))::int preciso,
          count(*) FILTER (WHERE geocode_quality = 'city')::int cidade,
          count(*) FILTER (WHERE geom IS NULL)::int semgeo
        FROM clients`);
      const visitaQ = await tx.execute(sql`
        SELECT
          count(*) FILTER (WHERE ultima_visita IS NULL)::int nunca,
          count(*) FILTER (WHERE ultima_visita IS NOT NULL AND (CURRENT_DATE - ultima_visita) > 180)::int mais180,
          count(*) FILTER (WHERE ultima_visita IS NOT NULL AND (CURRENT_DATE - ultima_visita) BETWEEN 90 AND 180)::int entre
        FROM clients`);

      const toRecord = (rows: unknown[], key: string) =>
        Object.fromEntries(
          rows.map((r) => [(r as Record<string, unknown>)[key], (r as { n: number }).n]),
        ) as Record<string, number>;

      const geo = geoQ.rows[0] as { preciso: number; cidade: number; semgeo: number };
      const visita = visitaQ.rows[0] as { nunca: number; mais180: number; entre: number };

      return {
        total,
        porOrigem: toRecord(origemQ.rows, 'origem'),
        porSituacao: toRecord(situacaoQ.rows, 'situacao'),
        porUf: (ufQ.rows as { uf: string; n: number }[]).map((r) => ({ uf: r.uf, total: r.n })),
        topMunicipios: (munQ.rows as { municipio: string; uf: string; n: number }[]).map((r) => ({
          municipio: r.municipio,
          uf: r.uf,
          total: r.n,
        })),
        geocodificacao: {
          rooftopOuRua: geo.preciso,
          cidade: geo.cidade,
          semGeo: geo.semgeo,
          percentPreciso: total ? Math.round((geo.preciso / total) * 100) : 0,
        },
        semVisita: { nunca: visita.nunca, mais180d: visita.mais180, entre90e180d: visita.entre },
      };
    });
  }
}

export const dashboardService = new DashboardService();
