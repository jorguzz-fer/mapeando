import type { SessionUser } from '@mapeando/shared';
import { create } from 'zustand';
import { api } from '../api/client';

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  carregar: () => Promise<void>;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  async carregar() {
    try {
      const user = await api.me();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  async login(email, senha) {
    const user = await api.login({ email, senha });
    set({ user });
  },
  async logout() {
    await api.logout();
    set({ user: null });
  },
}));
