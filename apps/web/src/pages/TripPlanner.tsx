import type { TripView } from '@mapeando/shared';
import { useState } from 'react';
import { api } from '../api/client';
import { CostBreakdown } from '../components/CostBreakdown';
import { MapView, type MapPoint } from '../components/MapView';
import { ReasonChips, ScoreBadge } from '../components/ScoreBadge';

export function TripPlanner() {
  const [cidade, setCidade] = useState('Pederneiras');
  const [uf, setUf] = useState('SP');
  const [raioKm, setRaioKm] = useState(80);
  const [topN, setTopN] = useState(8);
  const [pernoite, setPernoite] = useState(false);
  const [horaSaida, setHoraSaida] = useState('08:00');

  const [trip, setTrip] = useState<TripView | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function planejar() {
    setLoading(true);
    setErro(null);
    setTrip(null);
    try {
      const cidadeInfo = await api.resolveCidade(cidade, uf || undefined);
      const { id } = await api.createTrip({
        origemLabel: cidadeInfo.label,
        origemLat: cidadeInfo.lat,
        origemLng: cidadeInfo.lng,
        horaSaida,
        pernoite,
      });
      const view = await api.planTrip(id, { autoSelect: { raioKm, topN }, returnToOrigin: true });
      setTrip(view);
    } catch (e) {
      setErro('Não foi possível planejar. Verifique a cidade e tente novamente.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function enviarWhatsapp(clientId: string) {
    try {
      const msg = await api.whatsapp({ clientId, cidade, hora: horaSaida });
      if (msg.link) window.open(msg.link, '_blank');
      else alert('Cliente sem telefone cadastrado.\n\n' + msg.texto);
    } catch {
      alert('Não foi possível gerar a mensagem.');
    }
  }

  const points: MapPoint[] = trip
    ? [
        { lat: trip.origemLat, lng: trip.origemLng, cor: '#1b66db', titulo: `Origem: ${trip.origemLabel}` },
        ...trip.stops
          .filter((s) => s.lat != null && s.lng != null)
          .map((s) => ({ lat: s.lat!, lng: s.lng!, cor: '#16a34a', titulo: `${s.seq + 1}. ${s.nome}` })),
      ]
    : [];

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      {/* Formulário */}
      <div className="rounded-card border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Destino">
            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="w-44 rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Cidade"
            />
          </Field>
          <Field label="UF">
            <input
              value={uf}
              onChange={(e) => setUf(e.target.value.toUpperCase())}
              maxLength={2}
              className="w-16 rounded-lg border border-slate-300 px-3 py-2"
            />
          </Field>
          <Field label="Raio">
            <select
              value={raioKm}
              onChange={(e) => setRaioKm(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              {[20, 50, 80, 100, 150, 200].map((r) => (
                <option key={r} value={r}>
                  {r} km
                </option>
              ))}
            </select>
          </Field>
          <Field label="Máx. visitas">
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              {[4, 6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Saída">
            <input
              type="time"
              value={horaSaida}
              onChange={(e) => setHoraSaida(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </Field>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
            <input type="checkbox" checked={pernoite} onChange={(e) => setPernoite(e.target.checked)} />
            Pernoite (2 dias)
          </label>
          <button
            onClick={planejar}
            disabled={loading}
            className="ml-auto rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? 'A IA está planejando…' : '✨ Planejar viagem'}
          </button>
        </div>
        {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      </div>

      {trip && trip.custo && (
        <div className="rounded-card border border-slate-200 bg-white p-4 shadow-sm">
          <CostBreakdown c={trip.custo} />
          <p className="mt-2 text-xs text-slate-400">* Pedágio é uma estimativa por km.</p>
        </div>
      )}

      <div className="flex min-h-[300px] flex-1 flex-col gap-3 overflow-hidden lg:flex-row">
        {/* Ranking */}
        <div className="overflow-auto rounded-card border border-slate-200 bg-white p-3 shadow-sm lg:w-[420px]">
          <h3 className="mb-2 text-sm font-semibold text-slate-600">
            {trip ? `Roteiro otimizado · ${trip.stops.length} visitas` : 'Defina a viagem e clique em Planejar'}
          </h3>
          <ol className="space-y-2">
            {trip?.stops.map((s) => (
              <li key={s.id} className="flex gap-3 rounded-lg border border-slate-100 p-2">
                <div className="flex flex-col items-center">
                  <ScoreBadge score={s.score} />
                  <span className="mt-1 text-xs text-slate-400">{s.chegadaEta}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-slate-800">
                      {s.seq + 1}. {s.nome}
                    </span>
                    <button
                      onClick={() => enviarWhatsapp(s.clientId)}
                      className="shrink-0 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                    >
                      WhatsApp
                    </button>
                  </div>
                  <div className="text-xs text-slate-500">
                    {s.municipio}
                    {s.uf ? ` - ${s.uf}` : ''}
                    {s.legDistanciaKm != null ? ` · ${s.legDistanciaKm} km` : ''}
                  </div>
                  <ReasonChips reasons={s.scoreReasons} />
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Mapa */}
        <div className="min-h-[300px] flex-1 overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm">
          <MapView points={points} route={trip?.routeGeometry ?? null} cluster={false} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </div>
  );
}
