import { type SQL, sql } from 'drizzle-orm';
import type {
  Client,
  ClientsQuery,
  NearbyClient,
  NearbyQuery,
  Paginated,
  PatchClient,
} from '@mapeando/shared';
import { queryInTenant, withTenant } from '../../db/db.js';
import { type ClientRow, clientSelect, mapClient } from './clients.sql.js';

function buildFilters(q: Partial<ClientsQuery>): SQL[] {
  const conds: SQL[] = [];
  if (q.q) {
    conds.push(
      sql`(coalesce(c.nome_fantasia,'') || ' ' || coalesce(c.razao_social,'') || ' ' || coalesce(c.nome_planilha,'')) ILIKE ${'%' + q.q + '%'}`,
    );
  }
  if (q.uf) conds.push(sql`c.uf = ${q.uf.toUpperCase()}`);
  if (q.municipio) conds.push(sql`upper(unaccent(c.municipio)) = upper(unaccent(${q.municipio}))`);
  if (q.origem) conds.push(sql`c.origem = ${q.origem}`);
  if (q.situacao) conds.push(sql`c.situacao = ${q.situacao}`);
  if (q.cnae) conds.push(sql`c.cnae = ${q.cnae}`);
  if (q.minPotencial != null) conds.push(sql`c.potencial >= ${q.minPotencial}`);
  if (q.semVisitaDias != null) {
    conds.push(
      sql`(c.ultima_visita IS NULL OR (CURRENT_DATE - c.ultima_visita) >= ${q.semVisitaDias})`,
    );
  }
  return conds;
}

export class ClientsService {
  async list(tenantId: string, q: ClientsQuery): Promise<Paginated<Client>> {
    const conds = buildFilters(q);
    const where = conds.length ? sql` WHERE ${sql.join(conds, sql` AND `)}` : sql``;
    const orderBy =
      q.sort === 'nome'
        ? sql`ORDER BY coalesce(c.nome_fantasia, c.razao_social, c.nome_planilha) ASC`
        : q.sort === 'ultimaVisita'
          ? sql`ORDER BY c.ultima_visita ASC NULLS FIRST`
          : sql`ORDER BY c.potencial DESC, c.id`;
    const offset = (q.page - 1) * q.pageSize;

    return withTenant(tenantId, async (tx) => {
      const totalRes = await tx.execute(sql`SELECT count(*)::int AS n FROM clients c${where}`);
      const total = (totalRes.rows[0] as { n: number }).n;
      const rowsRes = await tx.execute(
        sql`SELECT ${clientSelect} FROM clients c${where} ${orderBy} LIMIT ${q.pageSize} OFFSET ${offset}`,
      );
      return {
        items: (rowsRes.rows as unknown as ClientRow[]).map(mapClient),
        total,
        page: q.page,
        pageSize: q.pageSize,
      };
    });
  }

  async get(tenantId: string, id: string): Promise<Client | null> {
    const rows = await queryInTenant<ClientRow>(
      tenantId,
      sql`SELECT ${clientSelect} FROM clients c WHERE c.id = ${id} LIMIT 1`,
    );
    return rows[0] ? mapClient(rows[0]) : null;
  }

  async patch(tenantId: string, id: string, patch: PatchClient): Promise<Client | null> {
    const sets: SQL[] = [];
    if (patch.ultimaVisita !== undefined) sets.push(sql`ultima_visita = ${patch.ultimaVisita}`);
    if (patch.ultimaCompra !== undefined) sets.push(sql`ultima_compra = ${patch.ultimaCompra}`);
    if (patch.faturamento !== undefined) sets.push(sql`faturamento = ${patch.faturamento}`);
    if (patch.potencial !== undefined) sets.push(sql`potencial = ${patch.potencial}`);
    if (patch.consultorId !== undefined) sets.push(sql`consultor_id = ${patch.consultorId}`);
    if (patch.lat !== undefined && patch.lng !== undefined) {
      sets.push(
        sql`geom = ST_SetSRID(ST_MakePoint(${patch.lng}, ${patch.lat}), 4326)::geography,
            geocode_quality = 'rooftop', geocode_source = 'manual'`,
      );
    }
    if (sets.length === 0) return this.get(tenantId, id);
    sets.push(sql`updated_at = now()`);
    await withTenant(tenantId, (tx) =>
      tx.execute(sql`UPDATE clients SET ${sql.join(sets, sql`, `)} WHERE id = ${id}`),
    );
    return this.get(tenantId, id);
  }

  async nearby(tenantId: string, q: NearbyQuery): Promise<NearbyClient[]> {
    const pt = sql`ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography`;
    const conds: SQL[] = [sql`c.geom IS NOT NULL`, sql`ST_DWithin(c.geom, ${pt}, ${q.raioKm * 1000})`];
    if (q.origem) conds.push(sql`c.origem = ${q.origem}`);
    if (q.situacao) conds.push(sql`c.situacao = ${q.situacao}`);
    else if (q.apenasAtivas) conds.push(sql`c.situacao = 'ATIVA'`);

    const rows = await queryInTenant<ClientRow & { distancia_m: number }>(
      tenantId,
      sql`SELECT ${clientSelect}, ST_Distance(c.geom, ${pt}) AS distancia_m
            FROM clients c
           WHERE ${sql.join(conds, sql` AND `)}
        ORDER BY distancia_m ASC
           LIMIT ${q.limit}`,
    );
    return rows.map((r) => ({ ...mapClient(r), distanciaM: Math.round(r.distancia_m) }));
  }
}

export const clientsService = new ClientsService();
