/**
 * Seed: cria usuário de acesso para o tenant Autron e, com --demo, sintetiza
 * sinais comerciais (última visita / faturamento) num subconjunto, para a
 * demonstração do Score/ROI ficar realista.
 *
 * Uso:  tsx scripts/seed-demo.ts [--demo]
 */
import pg from 'pg';
import { env } from '../src/config/env.js';
import { AuthService } from '../src/modules/auth/auth.service.js';

const TENANT_SLUG = 'autron';
const ADMIN_EMAIL = 'daniele@autron.com.br';
const ADMIN_SENHA = 'mapeando123';

async function main() {
  const demo = process.argv.includes('--demo');
  const pool = new pg.Pool({ connectionString: env.DATABASE_ADMIN_URL ?? env.DATABASE_URL, max: 3 });
  pg.types.setTypeParser(1700, (x) => (x === null ? null : Number(x)));

  try {
    const t = await pool.query<{ id: string }>('SELECT id FROM tenants WHERE slug=$1', [TENANT_SLUG]);
    const tenantId = t.rows[0]?.id;
    if (!tenantId) throw new Error('Tenant Autron não existe — rode o import primeiro.');

    const hash = await AuthService.hashSenha(ADMIN_SENHA);
    await pool.query(
      `INSERT INTO users(tenant_id, nome, email, senha_hash, papel)
       VALUES ($1,$2,$3,$4,'admin')
       ON CONFLICT (email) DO UPDATE SET senha_hash=excluded.senha_hash, papel='admin'`,
      [tenantId, 'Daniele', ADMIN_EMAIL, hash],
    );
    // eslint-disable-next-line no-console
    console.log(`[seed] usuário ${ADMIN_EMAIL} / senha ${ADMIN_SENHA} pronto (tenant Autron)`);

    // vendedor de exemplo (home base em São Paulo)
    await pool.query(
      `INSERT INTO sellers(tenant_id, nome, email, home_municipio, home_uf, geom)
       SELECT $1,'Vendedor Demo','vendedor@autron.com.br','SAO PAULO','SP',
              ST_SetSRID(ST_MakePoint(-46.6388,-23.5489),4326)::geography
       WHERE NOT EXISTS (SELECT 1 FROM sellers WHERE tenant_id=$1 AND email='vendedor@autron.com.br')`,
      [tenantId],
    );

    if (demo) {
      // ~40% recebem última visita (30..400 dias atrás) e ~35% faturamento
      const res = await pool.query<{ id: string; potencial: number }>(
        `SELECT id, potencial FROM clients WHERE tenant_id=$1 AND origem='Clientes'`,
        [tenantId],
      );
      let nv = 0;
      let nf = 0;
      for (const r of res.rows) {
        const sets: string[] = [];
        const vals: unknown[] = [r.id];
        if (Math.random() < 0.4) {
          const dias = 30 + Math.floor(Math.random() * 370);
          sets.push(`ultima_visita = CURRENT_DATE - ($${vals.length + 1}||' days')::interval`);
          vals.push(dias);
          nv++;
        }
        if (Math.random() < 0.35) {
          // faturamento correlacionado ao potencial
          const fat = Math.round((r.potencial / 100) * (200_000 + Math.random() * 4_000_000));
          sets.push(`faturamento = $${vals.length + 1}`);
          vals.push(fat);
          nf++;
        }
        if (sets.length) {
          await pool.query(`UPDATE clients SET ${sets.join(', ')} WHERE id=$1`, vals);
        }
      }
      // eslint-disable-next-line no-console
      console.log(`[seed] demo: ${nv} com última visita, ${nf} com faturamento`);
    }
  } finally {
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seed] erro:', err);
    process.exit(1);
  });
