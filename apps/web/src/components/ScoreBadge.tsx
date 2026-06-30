import { scoreColor } from '../lib/format';

export function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${scoreColor(score)}`}
      title={`Score ${score}/100`}
    >
      {score}
    </span>
  );
}

export function ReasonChips({ reasons }: { reasons: string[] }) {
  if (!reasons.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {reasons.map((r, i) => (
        <span
          key={i}
          className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
        >
          {r}
        </span>
      ))}
    </div>
  );
}
