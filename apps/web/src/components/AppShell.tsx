import { type ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { ChatPanel } from './ChatPanel';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '🗺️' },
  { to: '/viagem', label: 'Planejar Viagem', icon: '🚗' },
  { to: '/missao', label: 'Missão Comercial', icon: '🎯' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xl">📍</span>
          <span className="text-lg font-bold text-brand-700">Mapeando</span>
          <span className="hidden text-xs text-slate-400 sm:inline">· {user?.tenantNome}</span>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <span className="mr-1">{n.icon}</span>
              <span className="hidden md:inline">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-slate-500 sm:inline">{user?.nome}</span>
          <button
            onClick={() => logout()}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto">{children}</main>

      {/* Botão flutuante do copiloto */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-5 right-5 z-20 flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-white shadow-lg transition hover:bg-brand-700"
      >
        <span>💬</span>
        <span className="hidden font-medium sm:inline">Copiloto</span>
      </button>

      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
