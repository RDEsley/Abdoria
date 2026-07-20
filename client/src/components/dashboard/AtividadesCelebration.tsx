import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Coins, Flame, Snowflake, Zap } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { CompletionCelebration } from '@/components/effects/CompletionCelebration';
import { useApp } from '@/hooks/useApp';
import { toLocalDateKey } from '@/lib/utils';
import { playWorkoutComplete } from '@/lib/sounds';
import { addDaysSaoPaulo, getWeekStartSaoPaulo } from '@shared/utils/timezone';
import { CURRENCY_NAME } from '@/types';

const DAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/**
 * "Tarefas realizadas": mesma linguagem visual da tela de missão completa
 * (semana com foguinhos + streak + XP), mostrada ao fechar a fila de
 * atividades do dia.
 */
export function AtividadesCelebration({
  totalConcluidas,
  xpGanho,
  moedasGanhas,
  streakAtual,
  efeitoId,
  onClose,
}: {
  totalConcluidas: number;
  xpGanho: number;
  moedasGanhas: number;
  streakAtual: number;
  efeitoId: string;
  onClose: () => void;
}) {
  const { history, user } = useApp();

  useEffect(() => {
    playWorkoutComplete();
  }, []);

  const week = useMemo(() => {
    const todayKey = toLocalDateKey(new Date());
    const monday = getWeekStartSaoPaulo();
    const ativos = new Set<string>();
    for (const entry of history) ativos.add(toLocalDateKey(entry.concluido_em));
    ativos.add(todayKey);
    const frozen = new Set(user?.gamificacao?.streak_congelamentos ?? []);
    return Array.from({ length: 7 }, (_, i) => {
      const key = addDaysSaoPaulo(monday, i);
      return {
        key,
        label: DAY_LABELS[i],
        ativo: ativos.has(key),
        frozen: !ativos.has(key) && frozen.has(key),
        isToday: key === todayKey,
        isFuture: key > todayKey,
      };
    });
  }, [history, user?.gamificacao?.streak_congelamentos]);

  return (
    <Modal open onClose={onClose} variant="bare" panelClassName="w-full max-w-sm" disableDismiss>
      <CompletionCelebration effectId={efeitoId} />
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="game-victory relative z-10 !p-6 text-center"
      >
        <div className="game-level-badge mx-auto mb-4">✓</div>
        <h2 className="game-victory__title">TAREFAS REALIZADAS!</h2>
        <p className="mt-2 text-sm font-bold text-stone-600">
          {totalConcluidas} atividade{totalConcluidas === 1 ? '' : 's'} concluída
          {totalConcluidas === 1 ? '' : 's'} hoje
        </p>

        <div className="game-victory-week">
          <p className="game-victory-week__streak">
            <Flame size={14} aria-hidden />
            {streakAtual} dia{streakAtual === 1 ? '' : 's'} de sequência
          </p>
          <div className="game-victory-week__days">
            {week.map((day, i) => (
              <div key={day.key} className="game-victory-week__col">
                <span className="game-victory-week__label" aria-hidden>
                  {day.label}
                </span>
                <motion.span
                  className={`game-victory-week__cell${
                    day.ativo
                      ? ' game-victory-week__cell--fire'
                      : day.frozen
                        ? ' game-victory-week__cell--frozen'
                        : day.isFuture
                          ? ' game-victory-week__cell--future'
                          : ''
                  }${day.isToday ? ' game-victory-week__cell--today' : ''}`}
                  initial={day.isToday ? { scale: 0 } : false}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.6, delay: 0.3 + i * 0.04 }}
                >
                  {day.ativo ? (
                    <Flame size={15} aria-hidden />
                  ) : day.frozen ? (
                    <Snowflake size={14} aria-hidden />
                  ) : null}
                </motion.span>
              </div>
            ))}
          </div>
        </div>

        {xpGanho > 0 && (
          <p className="game-victory__xp mt-3">
            <Zap size={14} aria-hidden /> +{xpGanho} XP
          </p>
        )}
        {moedasGanhas > 0 && (
          <p className="game-victory__abdoria">
            <Coins size={14} aria-hidden /> +{moedasGanhas} {CURRENCY_NAME}
          </p>
        )}

        <GameButton
          className="mt-5 flex w-full items-center justify-center"
          size="lg"
          onClick={onClose}
        >
          Continuar
        </GameButton>
      </motion.div>
    </Modal>
  );
}
