import { type LatLng, haversineMeters } from '@mapeando/shared';
import { type Coord, type RouteResult, osrmTrip } from './osrm.js';

/** Velocidade média rodoviária assumida no fallback (km/h → m/s). */
const FALLBACK_SPEED_MS = (70 * 1000) / 3600;

/** Vizinho-mais-próximo (greedy) + Haversine, quando o OSRM não responde. */
function greedyFallback(origin: LatLng, stops: LatLng[], roundtrip: boolean): RouteResult {
  const remaining = stops.map((_, i) => i);
  const order: number[] = [];
  const legs = [];
  let current = origin;
  let total = 0;
  while (remaining.length) {
    let best = 0;
    let bestD = Infinity;
    remaining.forEach((idx, k) => {
      const d = haversineMeters(current, stops[idx]!);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    });
    const idx = remaining.splice(best, 1)[0]!;
    order.push(idx);
    legs.push({ distanceM: bestD, durationS: bestD / FALLBACK_SPEED_MS });
    total += bestD;
    current = stops[idx]!;
  }
  if (roundtrip) {
    const back = haversineMeters(current, origin);
    legs.push({ distanceM: back, durationS: back / FALLBACK_SPEED_MS });
    total += back;
  }
  const seq = [origin, ...order.map((i) => stops[i]!), ...(roundtrip ? [origin] : [])];
  return {
    order,
    geometry: { type: 'LineString', coordinates: seq.map((p) => [p.lng, p.lat]) },
    legs,
    totalDistanceM: total,
    totalDurationS: total / FALLBACK_SPEED_MS,
    source: 'fallback',
  };
}

/**
 * Planeja a rota ótima: tenta OSRM /trip (TSP real) e cai para o greedy
 * Haversine se o OSRM estiver indisponível — assim o app nunca quebra.
 */
export async function planRoute(
  origin: LatLng,
  stops: LatLng[],
  roundtrip: boolean,
): Promise<RouteResult> {
  if (stops.length === 0) {
    return {
      order: [],
      geometry: { type: 'LineString', coordinates: [[origin.lng, origin.lat]] },
      legs: [],
      totalDistanceM: 0,
      totalDurationS: 0,
      source: 'fallback',
    };
  }
  try {
    const originC: Coord = [origin.lng, origin.lat];
    const stopsC: Coord[] = stops.map((s) => [s.lng, s.lat]);
    return await osrmTrip(originC, stopsC, roundtrip);
  } catch {
    return greedyFallback(origin, stops, roundtrip);
  }
}
