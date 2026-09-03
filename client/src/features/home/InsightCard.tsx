import type { EvolynInsight } from '@shared/activities';

export function InsightCard({ insight }: { insight: EvolynInsight | null }) {
  if (!insight) return null;
  return (
    <article className="glass-card p-4">
      <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-stone-400">
        Insight
      </p>
      <h3 className="mt-1 text-sm font-extrabold text-stone-800">{insight.title}</h3>
      <p className="mt-1 text-xs font-semibold text-stone-500">{insight.body}</p>
    </article>
  );
}
