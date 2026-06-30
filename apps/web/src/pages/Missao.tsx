import { useState } from 'react';
import { api } from '../api/client';

const EXEMPLOS = [
  'Tenho 2 dias livres na próxima semana e quero gerar pelo menos R$500 mil em oportunidades no interior de SP.',
  'Quero visitar grandes clientes sem visita há mais de 6 meses num raio de 100 km de Campinas.',
  'Monte um bate-volta de São Paulo para Sorocaba com os 6 clientes mais importantes.',
];

export function Missao() {
  const [pedido, setPedido] = useState(EXEMPLOS[0]!);
  const [resposta, setResposta] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function gerar() {
    setLoading(true);
    setResposta(null);
    try {
      const r = await api.missao(pedido);
      setResposta(r.texto);
    } catch {
      setResposta('Erro ao gerar a missão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-bold text-slate-800">🎯 Missão Comercial Inteligente</h1>
      <p className="mb-3 text-sm text-slate-500">
        Descreva seu objetivo em linguagem natural. A IA escolhe cidades, seleciona os clientes
        prioritários, monta a sequência, estima custos e projeta a receita.
      </p>

      <textarea
        value={pedido}
        onChange={(e) => setPedido(e.target.value)}
        rows={3}
        className="w-full rounded-card border border-slate-300 p-3 outline-none focus:border-brand-500"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {EXEMPLOS.map((ex) => (
          <button
            key={ex}
            onClick={() => setPedido(ex)}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200"
          >
            {ex.slice(0, 40)}…
          </button>
        ))}
      </div>
      <button
        onClick={gerar}
        disabled={loading}
        className="mt-3 rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? 'A IA está montando sua missão…' : '✨ Gerar missão'}
      </button>

      {resposta && (
        <div className="mt-5 whitespace-pre-wrap rounded-card border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
          {resposta}
        </div>
      )}
    </div>
  );
}
