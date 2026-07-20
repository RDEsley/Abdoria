import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLottie } from 'lottie-react';
import { ChevronRight, Coins, Flame, ListChecks, Snowflake, Zap } from 'lucide-react';
import { CompletionCelebration } from '@/components/effects/CompletionCelebration';
import { LevelUpCelebration } from '@/components/effects/LevelUpCelebration';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { MiniErrorBoundary } from '@/components/ui/MiniErrorBoundary';
import { ShareCardTrigger } from '@/components/share/ShareCardTrigger';
import { useApp } from '@/hooks/useApp';
import { useLottieAsset } from '@/hooks/useLottieAsset';
import { toLocalDateKey } from '@/lib/utils';
import { addDaysSaoPaulo, getWeekStartSaoPaulo } from '@shared/utils/timezone';
import { CURRENCY_NAME, type LevelUpCelebration as LevelUpData } from '@/types';
import type { XpBreakdown } from '@/types';

const DAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const CONFETTI_LOTTIE_URL = '/assets/Confetti.json';
const SUCESSO_LOTTIE_URL = '/assets/Sucesso.json';

function LottieView({ data, loop }: { data: unknown | null; loop: boolean }) {
  const { View } = useLottie(
    { animationData: data ?? undefined, loop },
    { width: '100%', height: '100%' },
  );
  return View;
}

function todayLabel(): string {
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Confete de missão completa — some sozinho, não faz loop. */
function VictoryConfetti() {
  const { user } = useApp();
  const data = useLottieAsset(CONFETTI_LOTTIE_URL);
  if (!data) return null;
  if (!(user?.preferencias?.confetti_animacoes_habilitadas ?? true)) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <LottieView data={data} loop={false} />
    </div>
  );
}

/** Selo de check animado — cai pro ✓ estático se a animação não carregar. */
function VictoryCheck() {
  const data = useLottieAsset(SUCESSO_LOTTIE_URL);
  if (!data) return <div className="game-level-badge mx-auto mb-4">✓</div>;
  return (
    <div className="game-victory__check mx-auto mb-4" aria-hidden>
      <LottieView data={data} loop={false} />
    </div>
  );
}

interface Props {
  workoutName: string;
  xpGained: number;
  abdoriaGained: number;
  /** Atividades encadeadas depois do treino que também entraram nesse resumo. */
  atividadesConcluidas?: number;
  xpBreakdown: XpBreakdown | null;
  streakCelebration: number | null;
  levelUpCelebration: LevelUpData | null;
  equippedEffectId: string;
  saving: boolean;
  saved: boolean;
  onFinish: () => void;
  onContinue: () => void;
  showRodadaModal: boolean;
  rodadaBusy: boolean;
  onRodadaKeep: () => void;
  onRodadaSwap: () => void;
}

/**
 * Tela única de missão completa: semana com foguinhos de streak, XP ganho e
 * compartilhamento. Só sai daqui quando o jogador toca em Continuar.
 */
export function WorkoutVictoryScreen({
  workoutName,
  xpGained,
  abdoriaGained,
  atividadesConcluidas,
  xpBreakdown,
  streakCelebration,
  levelUpCelebration,
  equippedEffectId,
  saving,
  saved,
  onFinish,
  onContinue,
  showRodadaModal,
  rodadaBusy,
  onRodadaKeep,
  onRodadaSwap,
}: Props) {
  const { history, stats, user } = useApp();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const week = useMemo(() => {
    const todayKey = toLocalDateKey(new Date());
    const monday = getWeekStartSaoPaulo();
    const trained = new Set<string>();
    for (const entry of history) trained.add(toLocalDateKey(entry.concluido_em));
    if (saved) trained.add(todayKey);
    const frozen = new Set(user?.gamificacao?.streak_congelamentos ?? []);
    return Array.from({ length: 7 }, (_, i) => {
      const key = addDaysSaoPaulo(monday, i);
      return {
        key,
        label: DAY_LABELS[i],
        trained: trained.has(key),
        frozen: !trained.has(key) && frozen.has(key),
        isToday: key === todayKey,
        isFuture: key > todayKey,
      };
    });
  }, [history, saved, user?.gamificacao?.streak_congelamentos]);

  const streakShown = streakCelebration ?? stats?.streak_atual ?? 0;

  return (
    <div className="game-app fixed inset-0 z-50 flex flex-col items-center justify-center p-6">
      <AnimatedBackground variant="player" />
      {saved && <CompletionCelebration effectId={equippedEffectId} />}
      {saved && (
        <MiniErrorBoundary>
          <VictoryConfetti />
        </MiniErrorBoundary>
      )}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="game-victory relative z-10"
      >
        <MiniErrorBoundary fallback={<div className="game-level-badge mx-auto mb-4">✓</div>}>
          <VictoryCheck />
        </MiniErrorBoundary>
        <h2 className="game-victory__title">MISSÃO COMPLETA!</h2>
        <p className="mt-2 text-sm font-bold text-stone-600">{workoutName}</p>

        {levelUpCelebration && (
          <LevelUpCelebration
            compact
            level={levelUpCelebration.level_novo}
            previousLevel={levelUpCelebration.level_anterior}
          />
        )}

        {saved && (
          <div className="game-victory-week">
            <p className="game-victory-week__streak">
              <Flame size={14} aria-hidden />
              {streakShown} dia{streakShown === 1 ? '' : 's'} de sequência
            </p>
            <div className="game-victory-week__days">
              {week.map((day, i) => (
                <div key={day.key} className="game-victory-week__col">
                  <span className="game-victory-week__label" aria-hidden>
                    {day.label}
                  </span>
                  <motion.span
                    className={`game-victory-week__cell${
                      day.trained
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
                    aria-label={
                      day.trained
                        ? 'Dia treinado'
                        : day.frozen
                          ? 'Dia congelado por Frozen Streak'
                          : 'Sem treino'
                    }
                  >
                    {day.trained ? (
                      <Flame size={15} aria-hidden />
                    ) : day.frozen ? (
                      <Snowflake size={14} aria-hidden />
                    ) : null}
                  </motion.span>
                </div>
              ))}
            </div>
          </div>
        )}

        {saved && (
          <div className="game-victory__rewards">
            <div className="game-victory__xp-wrap">
              <button
                type="button"
                className="game-victory__xp game-victory__xp--interactive"
                onClick={() => setShowBreakdown((v) => !v)}
                aria-expanded={xpBreakdown ? showBreakdown : undefined}
                aria-describedby={xpBreakdown ? 'victory-xp-breakdown' : undefined}
              >
                <Zap size={14} aria-hidden /> +{xpGained} XP
              </button>
              {xpBreakdown && (
                <ul
                  id="victory-xp-breakdown"
                  role="tooltip"
                  className={`game-victory__breakdown${showBreakdown ? ' game-victory__breakdown--visible' : ''}`}
                >
                  {xpBreakdown.exercicios > 0 && <li>Exercícios +{xpBreakdown.exercicios}</li>}
                  {xpBreakdown.exercicios === 0 && xpBreakdown.total_diario === 0 && (
                    <li className="game-victory__breakdown-cap">Mín. 3 exercícios para XP diário</li>
                  )}
                  {xpBreakdown.streak > 0 && <li>Streak +{xpBreakdown.streak}</li>}
                  {xpBreakdown.conquistas > 0 && <li>Conquistas +{xpBreakdown.conquistas}</li>}
                  {xpBreakdown.total_bruto > xpBreakdown.aplicado && (
                    <li className="game-victory__breakdown-cap">
                      Máx. diário · +{xpBreakdown.aplicado}/{xpBreakdown.total_bruto} XP
                    </li>
                  )}
                </ul>
              )}
            </div>
            {abdoriaGained > 0 && (
              <p className="game-victory__abdoria">
                <Coins size={14} aria-hidden /> +{abdoriaGained} {CURRENCY_NAME}
              </p>
            )}
            {!!atividadesConcluidas && atividadesConcluidas > 0 && (
              <p className="game-victory__atividades">
                <ListChecks size={13} aria-hidden /> +{atividadesConcluidas} atividade
                {atividadesConcluidas === 1 ? '' : 's'} concluída
                {atividadesConcluidas === 1 ? '' : 's'} junto
              </p>
            )}
          </div>
        )}

        {!saved ? (
          <GameButton onClick={onFinish} size="lg" className="mt-6 w-full" disabled={saving}>
            {saving ? 'Salvando...' : 'Concluir missão'}
          </GameButton>
        ) : (
          <>
            <ShareCardTrigger
              className="mt-5 w-full"
              data={{
                kind: 'workout',
                workoutName,
                dateLabel: todayLabel(),
                xpGained,
                streakAtual: streakShown || undefined,
              }}
            />
            <GameButton
              onClick={onContinue}
              size="lg"
              className="mt-2 flex w-full items-center justify-center gap-2"
            >
              Continuar <ChevronRight size={18} />
            </GameButton>
          </>
        )}
      </motion.div>

      <Modal
        open={showRodadaModal}
        onClose={onRodadaKeep}
        variant="bare"
        panelClassName="w-full max-w-sm"
        labelledBy="rodada-completa-title"
        disableDismiss
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="game-victory !p-6"
        >
          <h3 id="rodada-completa-title" className="game-victory__title !text-base">
            Rodada completa!
          </h3>
          <p className="mt-2 text-sm font-bold text-stone-600">
            Você completou todos os ciclos ativos. Quer um novo set de treinos?
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <GameButton variant="secondary" size="lg" className="w-full" onClick={onRodadaKeep}>
              Manter sugestão atual
            </GameButton>
            <GameButton size="lg" className="w-full" disabled={rodadaBusy} onClick={onRodadaSwap}>
              {rodadaBusy ? 'Sorteando...' : 'Trocar por novo set'}
            </GameButton>
          </div>
        </motion.div>
      </Modal>
    </div>
  );
}
