import { useEffect, useMemo } from 'react';
import { Medal, Sparkles } from 'lucide-react';
import { computePersonalRecords } from '@shared/personal-records';
import { useApp } from '@/hooks/useApp';

const NOVO_RECORDE_DIAS = 7;

function formatRecordDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

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

  const novoLimite = Date.now() - NOVO_RECORDE_DIAS * 24 * 60 * 60 * 1000;

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
          {records.map((r) => {
            const dataRecorde = new Date(r.concluido_em).getTime();
            const recente = !Number.isNaN(dataRecorde) && dataRecorde >= novoLimite;
            return (
              <li
                key={r.slug}
                className="flex items-center justify-between gap-2 rounded-xl border-2 border-stone-100 bg-stone-50 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Medal className="shrink-0 text-amber-600" size={16} aria-hidden />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-stone-700">{r.nome}</span>
                      {recente && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-wide text-amber-700">
                          <Sparkles size={9} aria-hidden /> Novo
                        </span>
                      )}
                    </span>
                    <span className="block text-[0.65rem] font-semibold text-stone-400">
                      batido em {formatRecordDate(r.concluido_em)}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-sm font-extrabold text-emerald-700">
                  {r.melhor_valor}
                  {r.unidade === 'segundos' ? 's' : ' reps'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
