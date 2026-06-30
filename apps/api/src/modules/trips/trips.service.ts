import { sql } from 'drizzle-orm';
import {
  type CreateTrip,
  type LatLng,
  type PlanTrip,
  type TripStopView,
  type TripView,
  haversineMeters,
} from '@mapeando/shared';
import { withTenant } from '../../db/db.js';
import { clientsService } from '../clients/clients.service.js';
import { estimateCost, receitaEsperada } from '../routing/cost.js';
import { planRoute } from '../routing/planner.js';
import { type ScorableClient, scoreClient } from '../scoring/scoring.js';

interface TripRow {
  id: string;
  titulo: string;
  mode: string;
  status: string;
  origem_label: string | null;
  origem_lat: number | null;
  origem_lng: number | null;
  pernoite: boolean;
  hora_saida: string | null;
  custo_json: unknown;
  route_geometry: unknown;
}

interface ScorableRow {
  id: string;
  nome: string;
  municipio: string | null;
  uf: string | null;
  lat: number | null;
  lng: number | null;
  potencial: number;
  faturamento: number | null;
  ultima_compra: string | null;
  dias_sem_visita: number | null;
  situacao: string;
  telefone1: string | null;
}

const SCORABLE_SELECT = sql`
  c.id, coalesce(c.nome_fantasia, c.razao_social, c.nome_planilha, 'Sem nome') AS nome,
  c.municipio, c.uf, ST_Y(c.geom::geometry) AS lat, ST_X(c.geom::geometry) AS lng,
  c.potencial, c.faturamento, c.ultima_compra, c.situacao, c.telefone1,
  CASE WHEN c.ultima_visita IS NULL THEN NULL ELSE (CURRENT_DATE - c.ultima_visita) END AS dias_sem_visita
`;

/** Carrega clientes (campos p/ score) por lista de ids, dentro do tenant. */
async function loadScorable(tenantId: string, ids: string[]): Promise<ScorableRow[]> {
  if (ids.length === 0) return [];
  const idList = sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  return withTenant(tenantId, async (tx) => {
    const res = await tx.execute(
      sql`SELECT ${SCORABLE_SELECT} FROM clients c WHERE c.id IN (${idList})`,
    );
    return res.rows as unknown as ScorableRow[];
  });
}

function toScorable(r: ScorableRow, origin?: LatLng): ScorableClient {
  return {
    potencial: r.potencial,
    diasSemVisita: r.dias_sem_visita,
    faturamento: r.faturamento,
    ultimaCompra: r.ultima_compra,
    situacao: r.situacao,
    distanciaM: origin && r.lat != null && r.lng != null
      ? haversineMeters(origin, { lat: r.lat, lng: r.lng })
      : null,
  };
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (h ?? 8) * 60 + (m ?? 0) + Math.round(minutes);
  const hh = Math.floor((total % (24 * 60)) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export class TripsService {
  async create(tenantId: string, sellerId: string | null, body: CreateTrip): Promise<{ id: string }> {
    const rows = await withTenant(tenantId, async (tx) => {
      const res = await tx.execute(sql`
        INSERT INTO trips(tenant_id, seller_id, titulo, origem_label, origem_geom, data_viagem, hora_saida, pernoite)
        VALUES (${tenantId}, ${sellerId}, ${body.titulo ?? `Viagem a ${body.origemLabel}`},
                ${body.origemLabel},
                ST_SetSRID(ST_MakePoint(${body.origemLng}, ${body.origemLat}), 4326)::geography,
                ${body.data ?? null}, ${body.horaSaida ?? '08:00'}, ${body.pernoite})
        RETURNING id`);
      return res.rows as unknown as { id: string }[];
    });
    return { id: rows[0]!.id };
  }

  private async loadTrip(tenantId: string, tripId: string): Promise<TripRow | null> {
    const rows = await withTenant(tenantId, async (tx) => {
      const res = await tx.execute(sql`
        SELECT id, titulo, mode, status, origem_label, pernoite, hora_saida, custo_json, route_geometry,
               ST_Y(origem_geom::geometry) AS origem_lat, ST_X(origem_geom::geometry) AS origem_lng
          FROM trips WHERE id = ${tripId} LIMIT 1`);
      return res.rows as unknown as TripRow[];
    });
    return rows[0] ?? null;
  }

  async plan(tenantId: string, tripId: string, body: PlanTrip): Promise<TripView | null> {
    const trip = await this.loadTrip(tenantId, tripId);
    if (!trip || trip.origem_lat == null || trip.origem_lng == null) return null;
    const origin: LatLng = { lat: trip.origem_lat, lng: trip.origem_lng };

    // 1) Candidatos
    let candidates: ScorableRow[];
    if (body.candidateIds?.length) {
      candidates = await loadScorable(tenantId, body.candidateIds);
    } else {
      const radiusKm = body.autoSelect?.raioKm ?? 50;
      const nearby = await clientsService.nearby(tenantId, {
        lat: origin.lat,
        lng: origin.lng,
        raioKm: radiusKm,
        apenasAtivas: true,
        limit: 200,
      });
      const topN = body.autoSelect?.topN ?? 8;
      const scored = nearby
        .map((c) => ({
          c,
          s: scoreClient(
            {
              potencial: c.potencial,
              diasSemVisita: c.diasSemVisita,
              faturamento: c.faturamento,
              ultimaCompra: c.ultimaCompra,
              situacao: c.situacao,
              distanciaM: c.distanciaM,
            },
            { hasRouteContext: true, maxDistanceM: radiusKm * 1000 },
          ).score,
        }))
        .sort((a, b) => b.s - a.s)
        .slice(0, topN)
        .map((x) => x.c.id);
      candidates = await loadScorable(tenantId, scored);
    }

    const withGeo = candidates.filter((c) => c.lat != null && c.lng != null);
    const maxDist = (body.autoSelect?.raioKm ?? 80) * 1000;

    // 2) Rota ótima (TSP via OSRM, fallback greedy)
    const route = await planRoute(
      origin,
      withGeo.map((c) => ({ lat: c.lat!, lng: c.lng! })),
      body.returnToOrigin,
    );
    const ordered = route.order.map((i) => withGeo[i]!);

    // 3) Score + ETA + persistência
    const horaSaida = trip.hora_saida ?? '08:00';
    let acumuladoMin = 0;
    const stopsToPersist = ordered.map((c, k) => {
      const leg = route.legs[k];
      const score = scoreClient(toScorable(c, origin), {
        hasRouteContext: true,
        maxDistanceM: maxDist,
      });
      acumuladoMin += (leg?.durationS ?? 0) / 60;
      const eta = addMinutes(horaSaida, acumuladoMin + k * 45);
      return { c, k, score, leg, eta };
    });

    const receita = ordered.reduce((a, c) => a + receitaEsperada(c), 0);
    const cost = estimateCost(
      {
        distanciaM: route.totalDistanceM,
        duracaoS: route.totalDurationS,
        nVisitas: ordered.length,
        pernoite: trip.pernoite,
        receitaEstimada: receita,
      },
    );

    await withTenant(tenantId, async (tx) => {
      await tx.execute(sql`DELETE FROM trip_stops WHERE trip_id = ${tripId}`);
      for (const sp of stopsToPersist) {
        await tx.execute(sql`
          INSERT INTO trip_stops(tenant_id, trip_id, client_id, seq, score, score_reasons,
                                 leg_distance_m, leg_duration_s, arrival_eta)
          VALUES (${tenantId}, ${tripId}, ${sp.c.id}, ${sp.k}, ${sp.score.score},
                  ${JSON.stringify(sp.score.reasons)}::jsonb,
                  ${sp.leg?.distanceM ?? null}, ${sp.leg?.durationS ?? null}, ${sp.eta})`);
      }
      await tx.execute(sql`
        UPDATE trips SET status='planejada', distancia_m=${route.totalDistanceM},
          duracao_s=${route.totalDurationS}, custo_total=${cost.custoTotal},
          receita_estimada=${cost.receitaEstimada}, roi=${cost.roi},
          custo_json=${JSON.stringify(cost)}::jsonb,
          route_geometry=${JSON.stringify(route.geometry)}::jsonb
        WHERE id=${tripId}`);
    });

    return this.get(tenantId, tripId);
  }

  async get(tenantId: string, tripId: string): Promise<TripView | null> {
    const trip = await this.loadTrip(tenantId, tripId);
    if (!trip) return null;
    const stops = await withTenant(tenantId, async (tx) => {
      const res = await tx.execute(sql`
        SELECT ts.id, ts.client_id, ts.seq, ts.score, ts.score_reasons,
               ts.leg_distance_m, ts.leg_duration_s, ts.arrival_eta,
               coalesce(c.nome_fantasia, c.razao_social, c.nome_planilha, 'Sem nome') AS nome,
               c.municipio, c.uf, c.telefone1,
               ST_Y(c.geom::geometry) AS lat, ST_X(c.geom::geometry) AS lng
          FROM trip_stops ts JOIN clients c ON c.id = ts.client_id
         WHERE ts.trip_id = ${tripId} ORDER BY ts.seq ASC`);
      return res.rows as unknown as Array<{
        id: string;
        client_id: string;
        seq: number;
        score: number;
        score_reasons: string[] | null;
        leg_distance_m: number | null;
        leg_duration_s: number | null;
        arrival_eta: string | null;
        nome: string;
        municipio: string | null;
        uf: string | null;
        telefone1: string | null;
        lat: number | null;
        lng: number | null;
      }>;
    });

    const stopViews: TripStopView[] = stops.map((s) => ({
      id: s.id,
      clientId: s.client_id,
      nome: s.nome,
      municipio: s.municipio,
      uf: s.uf,
      lat: s.lat,
      lng: s.lng,
      seq: s.seq,
      score: s.score,
      scoreReasons: s.score_reasons ?? [],
      legDistanciaKm: s.leg_distance_m != null ? Math.round(s.leg_distance_m / 100) / 10 : null,
      legDuracaoMin: s.leg_duration_s != null ? Math.round(s.leg_duration_s / 60) : null,
      chegadaEta: s.arrival_eta,
      telefone: s.telefone1,
    }));

    return {
      id: trip.id,
      titulo: trip.titulo,
      mode: trip.mode as TripView['mode'],
      status: trip.status,
      origemLabel: trip.origem_label ?? '',
      origemLat: trip.origem_lat ?? 0,
      origemLng: trip.origem_lng ?? 0,
      stops: stopViews,
      routeGeometry: (trip.route_geometry as TripView['routeGeometry']) ?? null,
      custo: (trip.custo_json as TripView['custo']) ?? null,
    };
  }
}

export const tripsService = new TripsService();
