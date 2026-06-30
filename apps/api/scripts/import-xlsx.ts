/**
 * Importa clientes-autron.xlsx (aba "Enriquecimento") para o banco.
 * - cria/recupera o tenant Autron
 * - popula segments (CNAE) e clients (com `potencial` derivado)
 * - roda o geocode Fase 0 (centróide IBGE) para todo registro
 *
 * Uso:  tsx scripts/import-xlsx.ts [caminho.xlsx]
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import xlsx from 'xlsx';
import { env } from '../src/config/env.js';
import { loadIbgeMunicipios } from '../src/modules/geo/ibge.js';
import { digits, norm } from '../src/modules/geo/normalize.js';
import { derivePotencial } from '../src/modules/scoring/potencial.js';
import { geocodeFase0 } from '../src/modules/geo/phase0.js';

const TENANT_SLUG = 'autron';
const TENANT_NOME = 'Autron';

function findXlsx(): string {
  const arg = process.argv[2];
  const candidates = [
    arg,
    resolve(process.cwd(), 'clientes-autron.xlsx'),
    resolve(process.cwd(), '../../clientes-autron.xlsx'),
  ].filter(Boolean) as string[];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error('clientes-autron.xlsx não encontrado (passe o caminho como argumento)');
}

function mapSituacao(v: string): string {
  const s = norm(v);
  if (['ATIVA', 'BAIXADA', 'INAPTA', 'SUSPENSA', 'NULA'].includes(s)) return s;
  return 'DESCONHECIDA';
}
function mapPorte(v: string): string {
  const s = norm(v);
  if (s.includes('MICRO')) return 'MICRO EMPRESA';
  if (s.includes('PEQUENO')) return 'EMPRESA DE PEQUENO PORTE';
  if (s.includes('DEMAIS')) return 'DEMAIS';
  return 'DESCONHECIDO';
}
function mapOrigem(v: string): string {
  const s = norm(v);
  if (s.startsWith('CLIENTE')) return 'Clientes';
  if (s.startsWith('FORNECEDOR')) return 'Fornecedores';
  if (s.startsWith('PROSPECT')) return 'Prospects';
  if (s.startsWith('LEAD')) return 'Leads';
  return 'Clientes';
}
function parseCapital(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  const cleaned = String(v).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
function parseBool(v: unknown): boolean | null {
  const s = norm(String(v ?? ''));
  if (s === 'SIM') return true;
  if (s === 'NAO') return false;
  return null;
}
function s(v: unknown): string | null {
  const t = v == null ? '' : String(v).trim();
  return t === '' ? null : t;
}

async function main() {
  const file = findXlsx();
  // eslint-disable-next-line no-console
  console.log(`[import] lendo ${file}`);
  const wb = xlsx.readFile(file);
  const ws = wb.Sheets['Enriquecimento'] ?? wb.Sheets[wb.SheetNames[0]!]!;
  const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
  // eslint-disable-next-line no-console
  console.log(`[import] ${rows.length} linhas`);

  // Scripts usam o role admin (BYPASSRLS) para provisionar tenant e carga em massa.
  const pool = new pg.Pool({ connectionString: env.DATABASE_ADMIN_URL ?? env.DATABASE_URL, max: 5 });
  pg.types.setTypeParser(1700, (x) => (x === null ? null : Number(x)));

  // 0) Gazetteer IBGE (global)
  const ibgeN = await loadIbgeMunicipios(pool);
  // eslint-disable-next-line no-console
  console.log(`[import] gazetteer IBGE: ${ibgeN} municípios`);

  const client = await pool.connect();
  try {
    // 1) tenant
    const t = await client.query(
      `INSERT INTO tenants(nome, slug) VALUES ($1,$2)
       ON CONFLICT (slug) DO UPDATE SET nome=excluded.nome RETURNING id`,
      [TENANT_NOME, TENANT_SLUG],
    );
    const tenantId: string = t.rows[0].id;
    // eslint-disable-next-line no-console
    console.log(`[import] tenant ${TENANT_NOME} = ${tenantId}`);

    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);

    // 2) segmentos distintos
    const segs = new Map<string, string | null>();
    for (const r of rows) {
      const cnae = s(r['CNAE']);
      if (cnae) segs.set(cnae, s(r['CNAE Descrição']));
    }
    for (const [cnae, desc] of segs) {
      await client.query(
        `INSERT INTO segments(tenant_id, cnae, descricao) VALUES ($1,$2,$3)
         ON CONFLICT (tenant_id, cnae) DO UPDATE SET descricao=excluded.descricao`,
        [tenantId, cnae, desc],
      );
    }
    // eslint-disable-next-line no-console
    console.log(`[import] ${segs.size} segmentos (CNAE)`);

    // 3) clientes
    let n = 0;
    for (const r of rows) {
      const porte = mapPorte(String(r['Porte'] ?? ''));
      const situacao = mapSituacao(String(r['Situação'] ?? ''));
      const capital = parseCapital(r['Capital Social']);
      const potencial = derivePotencial({ porte, capitalSocial: capital, situacao });
      const grau = Number(r['Grau de Risco (NR-4)']);
      await client.query(
        `INSERT INTO clients(
           tenant_id, origem, codigo, loja, nome_planilha, cnpj_cpf, razao_social, nome_fantasia,
           situacao, cnae, cnae_descricao, capital_social, porte, matriz_filial, grau_risco,
           sesmt_provavel, rh_estruturado, email, telefone1, telefone2,
           logradouro, numero, complemento, bairro, municipio, uf, cep, observacao, potencial)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
                 $21,$22,$23,$24,$25,$26,$27,$28,$29)
         ON CONFLICT (tenant_id, origem, codigo, loja) DO UPDATE SET
           nome_planilha=excluded.nome_planilha, cnpj_cpf=excluded.cnpj_cpf,
           razao_social=excluded.razao_social, nome_fantasia=excluded.nome_fantasia,
           situacao=excluded.situacao, cnae=excluded.cnae, cnae_descricao=excluded.cnae_descricao,
           capital_social=excluded.capital_social, porte=excluded.porte,
           grau_risco=excluded.grau_risco, email=excluded.email,
           telefone1=excluded.telefone1, telefone2=excluded.telefone2,
           logradouro=excluded.logradouro, numero=excluded.numero, bairro=excluded.bairro,
           municipio=excluded.municipio, uf=excluded.uf, cep=excluded.cep,
           potencial=excluded.potencial, updated_at=now()`,
        [
          tenantId,
          mapOrigem(String(r['Origem'] ?? '')),
          s(r['Código']),
          s(r['Loja']) ?? '01',
          s(r['Nome (planilha)']),
          digits(s(r['CNPJ/CPF'])) || null,
          s(r['Razão Social']),
          s(r['Nome Fantasia']),
          situacao,
          s(r['CNAE']),
          s(r['CNAE Descrição']),
          capital,
          porte,
          s(r['Matriz/Filial']),
          Number.isFinite(grau) ? grau : null,
          parseBool(r['SESMT provável']),
          parseBool(r['RH estruturado provável']),
          s(r['E-mail']),
          s(r['Telefone 1']),
          s(r['Telefone 2']),
          s(r['Logradouro']),
          s(r['Número']),
          s(r['Complemento']),
          s(r['Bairro']),
          s(r['Município']),
          (s(r['UF']) ?? '').slice(0, 2) || null,
          digits(s(r['CEP'])) || null,
          s(r['Observação']),
          potencial,
        ],
      );
      n++;
      if (n % 1000 === 0) console.log(`[import] ${n} clientes…`);
    }
    await client.query('COMMIT');
    // eslint-disable-next-line no-console
    console.log(`[import] ${n} clientes inseridos/atualizados`);

    // 4) geocode fase 0 (centróide IBGE)
    const geo = await geocodeFase0(pool, tenantId);
    // eslint-disable-next-line no-console
    console.log(`[import] geocode fase 0: ${geo} clientes posicionados por município`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[import] erro:', err);
    process.exit(1);
  });
