import type { GeoJsonLineString } from '@mapeando/shared';
import { env } from '../../config/env.js';

export type Coord = [number, number]; // [lng, lat]

export interface RouteLeg {
  distanceM: number;
  durationS: number;
}
export interface RouteResult {
  order: number[]; // ordem de visita dos pontos intermediários (índices 0..n-1)
  geometry: GeoJsonLineString | null;
  legs: RouteLeg[];
  totalDistanceM: number;
  totalDurationS: number;
  source: 'osrm' | 'fallback';
}

function coordStr(coords: Coord[]): string {
  return coords.map(([lng, lat]) => `${lng},${lat}`).join(';');
}

async function osrmGet(path: string): Promise<any> {
  const base = env.OSRM_URL.replace(/\/$/, '');
  const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = (await res.json()) as any;
  if (data.code !== 'Ok') throw new Error(`OSRM code ${data.code}`);
  return data;
}

/**
 * Resolve a melhor sequência (TSP) via OSRM /trip. `coords[0]` é a origem
 * (source=first). Retorna ordem dos pontos *intermediários* (sem a origem).
 */
export async function osrmTrip(origin: Coord, stops: Coord[], roundtrip: boolean): Promise<RouteResult> {
  const coords = [origin, ...stops];
  const data = await osrmGet(
    `/trip/v1/driving/${coordStr(coords)}?source=first&roundtrip=${roundtrip}&overview=full&geometries=geojson`,
  );
  const trip = data.trips[0];
  // waypoints[i].waypoint_index = posição no tour. i=0 é a origem.
  const wp: { waypoint_index: number }[] = data.waypoints;
  const order = stops
    .map((_, i) => ({ stopIdx: i, tourPos: wp[i + 1]!.waypoint_index }))
    .sort((a, b) => a.tourPos - b.tourPos)
    .map((x) => x.stopIdx);

  const legs: RouteLeg[] = (trip.legs ?? []).map((l: any) => ({
    distanceM: l.distance,
    durationS: l.duration,
  }));
  return {
    order,
    geometry: trip.geometry as GeoJsonLineString,
    legs,
    totalDistanceM: trip.distance,
    totalDurationS: trip.duration,
    source: 'osrm',
  };
}

/** Geometria/legs para uma sequência já definida (após reordenar manual). */
export async function osrmRoute(coords: Coord[]): Promise<RouteResult> {
  const data = await osrmGet(
    `/route/v1/driving/${coordStr(coords)}?overview=full&geometries=geojson&annotations=distance,duration`,
  );
  const route = data.routes[0];
  const legs: RouteLeg[] = (route.legs ?? []).map((l: any) => ({
    distanceM: l.distance,
    durationS: l.duration,
  }));
  return {
    order: coords.slice(1).map((_, i) => i),
    geometry: route.geometry as GeoJsonLineString,
    legs,
    totalDistanceM: route.distance,
    totalDurationS: route.duration,
    source: 'osrm',
  };
}
