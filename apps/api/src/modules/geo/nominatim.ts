import type { GeocodeQuality } from '@mapeando/shared';
import { env } from '../../config/env.js';

export interface GeocodeResult {
  lat: number;
  lng: number;
  quality: GeocodeQuality;
  raw: unknown;
}

/** Token bucket simples: respeita ~1 req/s do Nominatim público. */
class RateLimiter {
  private last = 0;
  constructor(private readonly minIntervalMs: number) {}
  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.last;
    if (elapsed < this.minIntervalMs) {
      await new Promise((r) => setTimeout(r, this.minIntervalMs - elapsed));
    }
    this.last = Date.now();
  }
}

// Self-hosted (NOMINATIM_URL setado) não precisa de throttle agressivo.
const limiter = new RateLimiter(env.NOMINATIM_URL ? 50 : 1100);

function osmTypeToQuality(r: { class?: string; type?: string; addresstype?: string }): GeocodeQuality {
  const t = r.addresstype ?? r.type;
  if (t === 'house' || t === 'building') return 'rooftop';
  if (t === 'road' || r.class === 'highway') return 'street';
  if (t === 'postcode') return 'cep';
  return 'street';
}

/** Geocodifica um endereço livre. Retorna null se nada encontrado. */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const base = (env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
  const url = new URL(`${base}/search`);
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('countrycodes', 'br');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '0');

  await limiter.wait();
  const res = await fetch(url, {
    headers: { 'User-Agent': env.NOMINATIM_USER_AGENT, 'Accept-Language': 'pt-BR' },
  });
  if (res.status === 429 || res.status >= 500) {
    throw new Error(`Nominatim ${res.status}`);
  }
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    class?: string;
    type?: string;
    addresstype?: string;
  }>;
  const hit = data[0];
  if (!hit) return null;
  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    quality: osmTypeToQuality(hit),
    raw: hit,
  };
}
