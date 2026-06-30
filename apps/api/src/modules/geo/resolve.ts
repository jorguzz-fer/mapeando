import { sql } from 'drizzle-orm';
import { db } from '../../db/db.js';
import { geocodeAddress } from './nominatim.js';

export interface ResolvedCity {
  lat: number;
  lng: number;
  label: string;
  municipio: string | null;
  uf: string | null;
  source: 'ibge' | 'nominatim';
}

/** Resolve uma cidade para coordenadas (centróide IBGE; fallback Nominatim). */
export async function resolveCidade(nome: string, uf?: string): Promise<ResolvedCity | null> {
  const ufCond = uf ? sql` AND uf = ${uf.toUpperCase()}` : sql``;
  const res = await db.execute(sql`
    SELECT municipio, uf, lat, lng FROM ibge_municipios
     WHERE upper(unaccent(municipio)) = upper(unaccent(${nome}))${ufCond}
     ORDER BY (uf = 'SP') DESC LIMIT 1`);
  const row = res.rows[0] as { municipio: string; uf: string; lat: number; lng: number } | undefined;
  if (row) {
    return {
      lat: row.lat,
      lng: row.lng,
      label: `${row.municipio} - ${row.uf}`,
      municipio: row.municipio,
      uf: row.uf,
      source: 'ibge',
    };
  }
  // fallback: Nominatim (cidade livre)
  const geo = await geocodeAddress(`${nome}${uf ? ' - ' + uf : ''}, Brasil`).catch(() => null);
  if (geo) {
    return {
      lat: geo.lat,
      lng: geo.lng,
      label: `${nome}${uf ? ' - ' + uf : ''}`,
      municipio: nome,
      uf: uf ?? null,
      source: 'nominatim',
    };
  }
  return null;
}
