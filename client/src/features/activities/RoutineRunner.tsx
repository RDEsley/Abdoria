import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Loader2, X } from 'lucide-react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/PageLoader';
import { WorkoutVictoryScreen } from '@/components/player/WorkoutVictoryScreen';
import { useActivitiesData } from '@/features/activities/useActivitiesData';
import { routineDoneActivityIdsToday } from '@shared/activities';
import { getTodaySaoPaulo } from '@shared/utils/timezone';
import { useAuth } from '@/hooks/useAuth';
import { resolveCosmeticos } from '@/types';
import { emitXpEarned } from '@/lib/xp-orbs';
import { playCompleteSet } from '@/lib/sounds';
import { selectionHaptic, successHaptic } from '@/lib/platform/native-runtime';
import { showGameToast } from '@/lib/game-toast';

export function RoutineRunnerPage() {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const data = useActivitiesData();
  const { user } = useAuth();
  const [sessionXp, setSessionXp] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [optimisticDone, setOptimisticDone] = useState<Set<string>>(() => new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

  const routine = data.routines.find((item) => item.id === routineId);
  const today = getTodaySaoPaulo();
  const doneIds = useMemo(() => {
    if (!routine) return new Set<string>();
    const todayLogs = data.logs.filter((log) => log.day_key === today);
    return routineDoneActivityIdsToday(routine, todayLogs);
  }, [data.logs, today, routine]);

  useEffect(() => {
    if (!data.loading && !routine) navigate('/atividades', { replace: true });
  }, [data.loading, routine, navigate]);

  // Consolida otimismo quando o log real chega.
  useEffect(() => {
    if (optimisticDone.size === 0) return;
    setOptimisticDone((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of prev) {
        if (doneIds.has(id) && !pendingIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [doneIds, optimisticDone.size, pendingIds]);

  if (data.loading || !routine) return <PageLoader />;

  const items = (routine.items ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => data.activities.find((activity) => activity.id === item.activity_id))
    .filter(Boolean);

  const total = items.length;
  const doneNow = items.filter(
    (activity) =>
      activity && (doneIds.has(activity.id) || optimisticDone.has(activity.id)),
  ).length;
  const allDone = total > 0 && doneNow === total;

  const handleComplete = async (activityId: string, activityName: string) => {
    if (
      doneIds.has(activityId) ||
      optimisticDone.has(activityId) ||
      pendingIds.has(activityId) ||
      data.isBusy(activityId)
    ) {
      return;
    }

    const activity = data.activities.find((item) => item.id === activityId);
    if (!activity) return;

    setOptimisticDone((prev) => new Set(prev).add(activityId));
    setPendingIds((prev) => new Set(prev).add(activityId));
    void selectionHaptic();

    const result = await data.complete(activity, {
      routineId: routine.id,
      silentFeedback: true,
    });

    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(activityId);
      return next;
    });

    if (!result) {
      setOptimisticDone((prev) => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });
      return;
    }

    if (result.xp_ganho > 0) emitXpEarned(result.xp_ganho);
    void successHaptic();
    playCompleteSet();
    const ganho = result.xp_ganho > 0 ? `+${result.xp_ganho} XP` : 'Registrado';
    showGameToast(`${activityName}: ${ganho}`, { variant: 'success' });
    setSessionXp((xp) => xp + result.xp_ganho);
    setDoneCount((count) => count + 1);
    if (doneNow + 1 >= total) setCelebrate(true);
  };

  if (celebrate) {
    return (
      <WorkoutVictoryScreen
        workoutName={routine.name}
        xpGained={sessionXp}
        abdoriaGained={0}
        atividadesConcluidas={doneCount}
        xpBreakdown={null}
        streakCelebration={null}
        levelUpCelebration={null}
        equippedEffectId={resolveCosmeticos(user?.cosmeticos).efeito_equipado}
        saving={false}
        saved
        onFinish={() => {}}
        onContinue={() => navigate('/atividades')}
        showRodadaModal={false}
        rodadaBusy={false}
        onRodadaKeep={() => {}}
        onRodadaSwap={() => {}}
      />
    );
  }

  return (
    <div className="game-player game-app fixed inset-x-0 top-[var(--top-navbar-height)] bottom-[calc(4.85rem+env(safe-area-inset-bottom,0px))] z-40 flex flex-col overflow-hidden md:right-0 md:bottom-0 md:left-64">
      <AnimatedBackground variant="player" />
      <header className="game-player-hud relative z-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => (allDone ? setCelebrate(true) : setConfirmExit(true))}
          aria-label={allDone ? 'Concluir rotina' : 'Sair'}
        >
          <X size={24} />
        </button>
        <div className="flex flex-col items-center">
          <p className="text-sm font-extrabold">{routine.name}</p>
          {total > 0 && (
            <small className="text-[0.65rem] font-bold text-stone-400">
              {doneNow}/{total}
            </small>
          )}
        </div>
        <span className="w-6" />
      </header>
      <ul className="relative z-10 flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {items.map((activity) => {
          if (!activity) return null;
          const done = doneIds.has(activity.id) || optimisticDone.has(activity.id);
          const pending = pendingIds.has(activity.id);
          return (
            <li key={activity.id}>
              <GameButton
                variant={done ? 'secondary' : 'primary'}
                className="w-full"
                disabled={done || pending}
                aria-busy={pending}
                onClick={() => void handleComplete(activity.id, activity.name)}
              >
                {pending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" aria-hidden />
                    Registrando…
                  </span>
                ) : done ? (
                  <span className="inline-flex items-center gap-2">
                    <Check size={16} aria-hidden />
                    {activity.name}
                  </span>
                ) : (
                  activity.name
                )}
              </GameButton>
            </li>
          );
        })}
      </ul>
      <div className="relative z-10 p-4">
        <button
          type="button"
          className="routine-runner__exit"
          onClick={() => (allDone ? setCelebrate(true) : setConfirmExit(true))}
        >
          {allDone ? 'Concluir rotina' : 'Sair / continuar depois'}
        </button>
      </div>

      <Modal
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        labelledBy="routine-exit-title"
      >
        <div className="p-4">
          <h2 id="routine-exit-title" className="game-section-title">
            Continuar depois?
          </h2>
          <p className="mt-2 text-sm font-semibold text-stone-500">
            {total > 0
              ? `Você já fez ${doneNow} de ${total}. Seu progresso fica salvo — retome quando quiser.`
              : 'Seu progresso fica salvo — retome quando quiser.'}
          </p>
          <div className="mt-4 flex gap-2">
            <GameButton
              variant="secondary"
              className="flex-1"
              onClick={() => setConfirmExit(false)}
            >
              Continuar rotina
            </GameButton>
            <GameButton className="flex-1" onClick={() => navigate('/atividades')}>
              Sair
            </GameButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
