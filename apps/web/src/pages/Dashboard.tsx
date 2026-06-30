import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { MapView, type MapPoint } from '../components/MapView';
import { num } from '../lib/format';

function Card({ titulo, valor, cor, sub }: { titulo: string; valor: string; cor?: string; sub?: string }) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{titulo}</div>
      <div className={`mt-1 text-2xl font-bold ${cor ?? 'text-slate-800'}`}>{valor}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Dashboard() {
  const stats = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });
  const points = useQuery({ queryKey: ['map-points'], queryFn: api.mapPoints });

  const d = stats.data;
  const ativos = d?.porSituacao['ATIVA'] ?? 0;
  const inativos = d
    ? (d.porSituacao['BAIXADA'] ?? 0) + (d.porSituacao['INAPTA'] ?? 0) + (d.porSituacao['SUSPENSA'] ?? 0)
    : 0;

  const mapPoints: MapPoint[] =
    points.data?.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      cor: p.origem === 'Fornecedores' ? '#f59e0b' : p.situacao === 'ATIVA' ? '#16a34a' : '#94a3b8',
    })) ?? [];

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">
          Hoje você tem <span className="text-brand-700">{num(d?.total ?? 0)}</span> empresas na base
        </h1>
        <p className="text-sm text-slate-500">
          {num(ativos)} ativas · {num(inativos)} inativas · cobertura em{' '}
          {d?.porUf.length ?? 0} estados
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card titulo="Clientes" valor={num(d?.porOrigem['Clientes'] ?? 0)} cor="text-brand-700" />
        <Card titulo="Fornecedores" valor={num(d?.porOrigem['Fornecedores'] ?? 0)} cor="text-amber-600" />
        <Card
          titulo="Geocodificados"
          valor={`${d ? Math.round(((d.total - d.geocodificacao.semGeo) / d.total) * 100) : 0}%`}
          cor="text-green-600"
          sub={`${num(d?.geocodificacao.cidade ?? 0)} por cidade`}
        />
        <Card
          titulo="Nunca visitados"
          valor={num(d?.semVisita.nunca ?? 0)}
          cor="text-red-600"
          sub={`${num(d?.semVisita.mais180d ?? 0)} há +180 dias`}
        />
      </div>

      <div className="flex min-h-[300px] flex-1 overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm">
        <div className="relative flex-1">
          <MapView points={mapPoints} cluster />
          <div className="absolute bottom-2 left-2 z-10 rounded-lg bg-white/90 px-3 py-2 text-xs shadow">
            <div className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full bg-cobertura-alta" /> Cliente ativo
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full bg-score-baixo" /> Cliente inativo
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full bg-cobertura-media" /> Fornecedor
            </div>
          </div>
        </div>
        <div className="hidden w-56 shrink-0 overflow-auto border-l border-slate-200 p-3 lg:block">
          <h3 className="mb-2 text-sm font-semibold text-slate-600">Top cidades</h3>
          <ul className="space-y-1 text-sm">
            {d?.topMunicipios.slice(0, 12).map((m) => (
              <li key={`${m.municipio}-${m.uf}`} className="flex justify-between text-slate-600">
                <span className="truncate">{m.municipio}</span>
                <span className="ml-2 font-medium text-slate-800">{m.total}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
