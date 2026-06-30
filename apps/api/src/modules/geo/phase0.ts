import pg from 'pg';

/**
 * Geocode Fase 0 (instantâneo, sem rede): posiciona cada cliente no centróide
 * do seu município (gazetteer IBGE), casando por (UF, nome normalizado).
 * Só preenche quem ainda não tem geom. Retorna nº de linhas posicionadas.
 */
export async function geocodeFase0(pool: pg.Pool, tenantId: string): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
    const res = await client.query(
      `UPDATE clients c
         SET geom = ST_SetSRID(ST_MakePoint(m.lng, m.lat), 4326)::geography,
             geocode_quality = 'city',
             geocode_source = 'ibge',
             updated_at = now()
        FROM ibge_municipios m
       WHERE c.tenant_id = $1
         AND c.geom IS NULL
         AND c.municipio IS NOT NULL
         AND c.uf = m.uf
         AND upper(unaccent(c.municipio)) = upper(unaccent(m.municipio))`,
      [tenantId],
    );
    await client.query('COMMIT');
    return res.rowCount ?? 0;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
