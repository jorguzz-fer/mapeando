import { type FormEvent, useState } from 'react';
import { useAuth } from '../store/auth';

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('daniele@autron.com.br');
  const [senha, setSenha] = useState('mapeando123');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await login(email, senha);
    } catch {
      setErro('E-mail ou senha inválidos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-700 to-brand-900 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-card bg-white p-8 shadow-xl"
      >
        <div className="mb-6 text-center">
          <div className="text-3xl">📍</div>
          <h1 className="text-2xl font-bold text-brand-700">Mapeando</h1>
          <p className="text-sm text-slate-500">Copiloto de Inteligência Comercial</p>
        </div>
        <label className="mb-1 block text-sm font-medium text-slate-600">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500"
        />
        <label className="mb-1 block text-sm font-medium text-slate-600">Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500"
        />
        {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
