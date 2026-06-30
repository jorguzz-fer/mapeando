import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useAuth } from './store/auth';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Missao } from './pages/Missao';
import { TripPlanner } from './pages/TripPlanner';

export function App() {
  const { user, loading, carregar } = useAuth();
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    carregar().finally(() => setBooted(true));
  }, [carregar]);

  if (!booted || loading) {
    return <div className="grid h-screen place-items-center text-slate-400">Carregando…</div>;
  }

  if (!user) return <Login />;

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/viagem" element={<TripPlanner />} />
        <Route path="/missao" element={<Missao />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
