import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Flame, Medal, Sparkles, Trophy } from 'lucide-react';
import { computePersonalRecords } from '@shared/personal-records';
import { useApp } from '@/hooks/useApp';

const NOVO_RECORDE_DIAS = 7;
const RECORDE_QUENTE_HORAS = 24;

function formatRecordDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const RANK_MEDALS = [
  { icon: Crown, className: 'text-amber-500' },
  { icon: Trophy, className: 'text-stone-400' },
  { icon: Medal, className: 'text-orange-600' },
] as const;

/** Melhor volume (série × repetições ou série × tempo) já registrado por exercício. */
export function PersonalRecordsPanel() {
  const { history, ensureHistory, historyLoading } = useApp();
  const [openedAt] = useState(() => Date.now());

  useEffect(() => {
    void ensureHistory();
  }, [ensureHistory]);

  const records = useMemo(() => {
    const map = computePersonalRecords(history);
    return [...map.values()].sort(
      (a, b) => new Date(b.concluido_em).getTime() - new Date(a.concluido_em).getTime(),
    );
  }, [history]);

  const novoLimite = openedAt - NOVO_RECORDE_DIAS * 24 * 60 * 60 * 1000;
  const quenteLimite = openedAt - RECORDE_QUENTE_HORAS * 60 * 60 * 1000;

  const novosCount = records.filter((r) => new Date(r.concluido_em).getTime() >= novoLimite).length;

  return (
    <section className="glass-card personal-records-panel p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="game-section-title">Recordes pessoais</h3>
        {records.length > 0 && (
          <span className="personal-records-count">
            <Trophy size={12} aria-hidden />
            {records.length}
          </span>
        )}
      </div>
      <p className="mb-3 text-xs font-bold leading-relaxed text-stone-500">
        Melhor volume por exercício — série × repetições ou série × tempo segurado.
        {novosCount > 0 && (
          <span className="ml-1 text-emerald-600">
            {novosCount} {novosCount === 1 ? 'novo' : 'novos'} essa semana!
          </span>
        )}
      </p>
      {historyLoading && <p className="text-sm text-stone-500">Carregando recordes...</p>}
      {!historyLoading && records.length === 0 && (
        <p className="text-sm text-stone-500">Complete treinos para começar a bater recordes.</p>
      )}
      {!historyLoading && records.length > 0 && (
        <ul className="flex flex-col gap-2">
          {records.map((r, i) => {
            const dataRecorde = new Date(r.concluido_em).getTime();
            const recente = !Number.isNaN(dataRecorde) && dataRecorde >= novoLimite;
            const quente = !Number.isNaN(dataRecorde) && dataRecorde >= quenteLimite;
            const medal = RANK_MEDALS[i];
            const MedalIcon = medal?.icon ?? Medal;
            return (
              <motion.li
                key={r.slug}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 6) * 0.04, duration: 0.22 }}
                className={`flex items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 ${
                  quente
                    ? 'personal-record-row--hot border-orange-200 bg-orange-50'
                    : 'border-stone-100 bg-stone-50'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <MedalIcon
                    className={`shrink-0 ${medal?.className ?? 'text-amber-600'}`}
                    size={16}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-stone-700">{r.nome}</span>
                      {quente && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-wide text-orange-700">
                          <Flame size={9} aria-hidden /> Quente
                        </span>
                      )}
                      {!quente && recente && (
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
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
