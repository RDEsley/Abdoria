import { useEffect, useMemo } from 'react';
import { Medal } from 'lucide-react';
import { computePersonalRecords } from '@shared/personal-records';
import { useApp } from '@/hooks/useApp';

/** Melhor volume (série × repetições ou série × tempo) já registrado por exercício. */
export function PersonalRecordsPanel() {
  const { history, ensureHistory, historyLoading } = useApp();

  useEffect(() => {
    void ensureHistory();
  }, [ensureHistory]);

  const records = useMemo(() => {
    const map = computePersonalRecords(history);
    return [...map.values()].sort(
      (a, b) => new Date(b.concluido_em).getTime() - new Date(a.concluido_em).getTime(),
    );
  }, [history]);

  return (
    <section className="glass-card p-4">
      <h3 className="game-section-title">Recordes pessoais</h3>
      <p className="mb-3 text-xs font-bold leading-relaxed text-stone-500">
        Melhor volume por exercício — série × repetições ou série × tempo segurado.
      </p>
      {historyLoading && <p className="text-sm text-stone-500">Carregando recordes...</p>}
      {!historyLoading && records.length === 0 && (
        <p className="text-sm text-stone-500">Complete treinos para começar a bater recordes.</p>
      )}
      {!historyLoading && records.length > 0 && (
        <ul className="flex flex-col gap-2">
          {records.map((r) => (
            <li
              key={r.slug}
              className="flex items-center justify-between gap-2 rounded-xl border-2 border-stone-100 bg-stone-50 px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Medal className="shrink-0 text-amber-600" size={16} aria-hidden />
                <span className="truncate text-sm font-bold text-stone-700">{r.nome}</span>
              </span>
              <span className="shrink-0 text-sm font-extrabold text-emerald-700">
                {r.melhor_valor}
                {r.unidade === 'segundos' ? 's' : ' reps'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
