import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));

/** Código IBGE numérico da UF → sigla. */
const UF_BY_CODE: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP',
  '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB',
  '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES',
  '33': 'RJ', '35': 'SP', '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS',
  '51': 'MT', '52': 'GO', '53': 'DF',
};

function findCsv(): string {
  for (const p of [
    resolve(here, '../../../../../infra/data/municipios.csv'),
    resolve(process.cwd(), 'infra/data/municipios.csv'),
    resolve(process.cwd(), '../../infra/data/municipios.csv'),
  ]) {
    try {
      readFileSync(p);
      return p;
    } catch {
      /* tenta próximo */
    }
  }
  throw new Error('infra/data/municipios.csv não encontrado');
}

/** Carrega o gazetteer IBGE (tabela global ibge_municipios). Idempotente. */
export async function loadIbgeMunicipios(pool: pg.Pool): Promise<number> {
  const csv = readFileSync(findCsv(), 'utf8').trim().split('\n');
  const header = csv[0]!.split(',');
  const idx = {
    codigo: header.indexOf('codigo_ibge'),
    nome: header.indexOf('nome'),
    lat: header.indexOf('latitude'),
    lng: header.indexOf('longitude'),
    uf: header.indexOf('codigo_uf'),
  };

  const client = await pool.connect();
  let n = 0;
  try {
    await client.query('BEGIN');
    for (const line of csv.slice(1)) {
      const cols = line.split(',');
      const codigo = cols[idx.codigo]?.trim();
      const nome = cols[idx.nome]?.trim();
      const lat = Number(cols[idx.lat]);
      const lng = Number(cols[idx.lng]);
      const uf = UF_BY_CODE[cols[idx.uf]?.trim() ?? ''];
      if (!codigo || !nome || !uf || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      await client.query(
        `INSERT INTO ibge_municipios(codigo_ibge, municipio, uf, lat, lng)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (codigo_ibge) DO UPDATE SET municipio=excluded.municipio,
           uf=excluded.uf, lat=excluded.lat, lng=excluded.lng`,
        [codigo, nome, uf, lat, lng],
      );
      n++;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return n;
}
