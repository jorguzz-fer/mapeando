/**
 * Geocode Fase 1 (preciso, em background, resumível): refina os clientes que
 * estão só em precisão de cidade, geocodificando o endereço completo via
 * Nominatim (rate-limited, com cache). Idempotente — pode rodar várias vezes.
 *
 * Uso:  tsx scripts/geocode-batch.ts [--uf SP] [--limit 500]
 * Dica: aponte NOMINATIM_URL para um Nominatim self-hosted p/ remover o limite.
 */
import pg from 'pg';
import { env } from '../src/config/env.js';
import { addressKey, buildAddress } from '../src/modules/geo/normalize.js';
import { geocodeAddress } from '../src/modules/geo/nominatim.js';

const TENANT_SLUG = 'autron';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const uf = arg('--uf');
  const limit = Number(arg('--limit') ?? '1000');
  const pool = new pg.Pool({ connectionString: env.DATABASE_ADMIN_URL ?? env.DATABASE_URL, max: 3 });

  try {
    const t = await pool.query<{ id: string }>('SELECT id FROM tenants WHERE slug=$1', [TENANT_SLUG]);
    const tenantId = t.rows[0]?.id;
    if (!tenantId) throw new Error('Tenant Autron não existe — rode o import primeiro.');

    const ufCond = uf ? 'AND uf = $2' : '';
    const params: unknown[] = [tenantId];
    if (uf) params.push(uf.toUpperCase());
    const { rows } = await pool.query(
      `SELECT id, logradouro, numero, bairro, municipio, uf, cep
         FROM clients
        WHERE tenant_id = $1 AND geocode_quality = 'city' AND logradouro IS NOT NULL ${ufCond}
        ORDER BY potencial DESC, uf
        LIMIT ${limit}`,
      params,
    );
    // eslint-disable-next-line no-console
    console.log(`[geocode] ${rows.length} endereços a refinar${uf ? ` (UF ${uf})` : ''}`);

    let ok = 0;
    let cached = 0;
    let miss = 0;
    for (const [i, r] of rows.entries()) {
      const key = addressKey(r);
      const c = await pool.query<{ lat: number; lng: number; quality: string }>(
        'SELECT lat, lng, quality FROM geocode_cache WHERE tenant_id=$1 AND norm_address=$2',
        [tenantId, key],
      );
      let lat: number | null = null;
      let lng: number | null = null;
      let quality = 'none';
      if (c.rows[0]?.lat != null) {
        ({ lat, lng, quality } = c.rows[0] as { lat: number; lng: number; quality: string });
        cached++;
      } else {
        try {
          const geo = await geocodeAddress(buildAddress(r));
          if (geo) {
            lat = geo.lat;
            lng = geo.lng;
            quality = geo.quality;
            ok++;
          } else {
            miss++;
          }
          await pool.query(
            `INSERT INTO geocode_cache(tenant_id, norm_address, lat, lng, source, quality, raw)
             VALUES ($1,$2,$3,$4,'nominatim',$5,$6)
             ON CONFLICT (tenant_id, norm_address) DO NOTHING`,
            [tenantId, key, lat, lng, quality, geo ? JSON.stringify(geo.raw) : null],
          );
        } catch (err) {
          // 429/5xx: aguarda e segue (resume na próxima execução)
          // eslint-disable-next-line no-console
          console.warn(`[geocode] falha (${(err as Error).message}); pausando 5s`);
          await new Promise((res) => setTimeout(res, 5000));
          continue;
        }
      }
      if (lat != null && lng != null && quality !== 'none') {
        await pool.query(
          `UPDATE clients SET geom = ST_SetSRID(ST_MakePoint($2,$3),4326)::geography,
             geocode_quality=$4, geocode_source='nominatim', updated_at=now()
           WHERE id=$1`,
          [r.id, lng, lat, quality],
        );
      }
      if ((i + 1) % 50 === 0) console.log(`[geocode] ${i + 1}/${rows.length} (ok=${ok} cache=${cached} miss=${miss})`);
    }
    // eslint-disable-next-line no-console
    console.log(`[geocode] concluído: ok=${ok} cache=${cached} miss=${miss}`);
  } finally {
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[geocode] erro:', err);
    process.exit(1);
  });
