import * as argon2 from 'argon2';
import type { Papel, SessionUser } from '@mapeando/shared';
import { adminPool } from '../../db/admin.js';

interface UserRow {
  id: string;
  tenant_id: string;
  nome: string;
  email: string;
  senha_hash: string;
  papel: Papel;
  tenant_nome: string;
}

export class AuthService {
  /** Autentica por e-mail+senha (cross-tenant via pool admin). */
  async login(email: string, senha: string): Promise<SessionUser | null> {
    const { rows } = await adminPool.query<UserRow>(
      `SELECT u.*, t.nome AS tenant_nome
         FROM users u JOIN tenants t ON t.id = u.tenant_id
        WHERE lower(u.email) = lower($1) LIMIT 1`,
      [email],
    );
    const user = rows[0];
    if (!user) return null;
    const ok = await argon2.verify(user.senha_hash, senha).catch(() => false);
    if (!ok) return null;
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      papel: user.papel,
      tenantId: user.tenant_id,
      tenantNome: user.tenant_nome,
    };
  }

  static hashSenha(senha: string): Promise<string> {
    return argon2.hash(senha, { type: argon2.argon2id });
  }
}

export const authService = new AuthService();
