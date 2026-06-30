import type { CostBreakdown as Cost } from '@mapeando/shared';
import { brl } from '../lib/format';

export function CostBreakdown({ c }: { c: Cost }) {
  const retornoX = c.custoTotal > 0 ? c.receitaEstimada / c.custoTotal : 0;
  const item = (label: string, v: string) => (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">{v}</span>
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
      {item('Distância', `${c.distanciaKm} km`)}
      {item('Duração', `${Math.floor(c.duracaoMin / 60)}h${String(c.duracaoMin % 60).padStart(2, '0')}`)}
      {item('Combustível', brl(c.combustivel))}
      {item('Pedágio*', brl(c.pedagio))}
      {item('Alimentação', brl(c.alimentacao))}
      {item('Hotel', brl(c.hotel))}
      {item('Custo total', brl(c.custoTotal))}
      {item('Custo/visita', brl(c.custoPorVisita))}
      <div className="col-span-2 mt-1 rounded-lg bg-brand-50 p-2 sm:col-span-2">
        <div className="text-xs text-brand-700">Receita potencial estimada</div>
        <div className="text-lg font-bold text-brand-700">{brl(c.receitaEstimada)}</div>
      </div>
      <div className="col-span-2 mt-1 rounded-lg bg-green-50 p-2 sm:col-span-2">
        <div className="text-xs text-green-700">Retorno potencial por R$ investido na viagem</div>
        <div className="text-lg font-bold text-green-700">
          {retornoX.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}×
        </div>
      </div>
    </div>
  );
}
