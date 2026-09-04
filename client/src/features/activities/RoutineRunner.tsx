import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/PageLoader';
import { RoutineCompleteScreen } from '@/features/activities/RoutineCompleteScreen';
import { useActivitiesData } from '@/features/activities/useActivitiesData';
import {
  isRoutineFullyRunnable,
  resolveRoutineHealth,
  routineDoneActivityIdsToday,
} from '@shared/activities';
import { getTodaySaoPaulo } from '@shared/utils/timezone';
import { emitXpEarned } from '@/lib/xp-orbs';
import { playCompleteSet } from '@/lib/sounds';
import { selectionHaptic } from '@/lib/platform/native-runtime';
import { showGameToast } from '@/lib/game-toast';
import { restoreRoutine } from '@/lib/api/activities';
import { getErrorMessage } from '@/lib/api-errors';

export function RoutineRunnerPage() {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const data = useActivitiesData();
  const [celebrate, setCelebrate] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [optimisticDone, setOptimisticDone] = useState<Set<string>>(() => new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [archiving, setArchiving] = useState(false);
  /** Snapshot: rotina já estava 100% ao abrir o Runner — não celebra de novo. */
  const openedCompleteRef = useRef<boolean | null>(null);

  const routine = data.routines.find((item) => item.id === routineId);
  const today = getTodaySaoPaulo();
  const liveIds = useMemo(
    () => new Set(data.activities.map((activity) => activity.id)),
    [data.activities],
  );
  const health = useMemo(
    () => (routine ? resolveRoutineHealth(routine, liveIds) : null),
    [routine, liveIds],
  );
  const needsAttention = Boolean(health && !isRoutineFullyRunnable(health));

  const doneIds = useMemo(() => {
    if (!routine) return new Set<string>();
    const todayLogs = data.logs.filter((log) => log.day_key === today);
    return routineDoneActivityIdsToday(routine, todayLogs);
  }, [data.logs, today, routine]);

  const items = useMemo(() => {
    if (!routine || needsAttention) return [];
    return (routine.items ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((item) => data.activities.find((activity) => activity.id === item.activity_id))
      .filter((activity): activity is NonNullable<typeof activity> => Boolean(activity));
  }, [routine, data.activities, needsAttention]);

  const total = items.length;

  useEffect(() => {
    if (!data.loading && !routine) navigate('/atividades', { replace: true });
  }, [data.loading, routine, navigate]);

  useEffect(() => {
    if (openedCompleteRef.current !== null || data.loading || !routine || total === 0) return;
    openedCompleteRef.current = doneIds.size >= total;
  }, [data.loading, routine, total, doneIds]);

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

  useEffect(() => {
    if (total === 0) return;
    let effective = 0;
    for (const activity of items) {
      if (doneIds.has(activity.id) || optimisticDone.has(activity.id)) effective += 1;
    }
    if (effective >= Math.max(0, total - 1)) {
      void import('@/hooks/useLottieAsset').then((m) =>
        m.prewarmLottieAsset('/assets/rotina-check.json'),
      );
    }
  }, [doneIds, items, optimisticDone, total]);

  if (data.loading || !routine || !health) return <PageLoader />;

  if (needsAttention) {
    const copy =
      health.state === 'empty'
        ? 'As atividades usadas nesta rotina não estão mais disponíveis.'
        : `${health.unavailableItems} atividade${health.unavailableItems === 1 ? '' : 's'} desta rotina não ${health.unavailableItems === 1 ? 'está' : 'estão'} mais disponível${health.unavailableItems === 1 ? '' : 'eis'}.`;

    return (
      <div className="game-player game-app fixed inset-x-0 top-[var(--top-navbar-height)] bottom-[calc(4.85rem+env(safe-area-inset-bottom,0px))] z-40 flex flex-col overflow-hidden md:right-0 md:bottom-0 md:left-64">
        <AnimatedBackground variant="player" />
        <header className="game-player-hud relative z-10 flex items-center justify-between">
          <button type="button" onClick={() => navigate('/atividades')} aria-label="Voltar">
            <X size={24} />
          </button>
          <p className="text-sm font-extrabold">{routine.name}</p>
          <span className="w-6" />
        </header>
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="grid place-items-center rounded-2xl bg-amber-50 p-3 text-amber-700">
            <AlertTriangle size={28} aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-stone-800">Esta rotina precisa de atenção</h2>
            <p className="mt-2 text-sm font-semibold text-stone-600">{copy}</p>
          </div>
          <div className="flex w-full max-w-sm flex-col gap-2">
            <GameButton
              onClick={() =>
                navigate('/atividades', { state: { editRoutineId: routine.id }, replace: true })
              }
            >
              Editar rotina
            </GameButton>
            <GameButton
              variant="secondary"
              disabled={archiving}
              onClick={() => {
                setArchiving(true);
                void data
                  .archiveRoutine(routine.id)
                  .then(async () => {
                    await data.reload();
                    showGameToast('Rotina arquivada', {
                      variant: 'info',
                      duration: 5000,
                      actionLabel: 'Desfazer',
                      onAction: () => {
                        void restoreRoutine(routine.id).then(() => data.reload());
                      },
                    });
                    navigate('/atividades', { replace: true });
                  })
                  .catch((error) => {
                    showGameToast(getErrorMessage(error, 'Não foi possível arquivar.'), {
                      variant: 'error',
                    });
                  })
                  .finally(() => setArchiving(false));
              }}
            >
              {archiving ? 'Arquivando…' : 'Arquivar rotina'}
            </GameButton>
            <GameButton variant="ghost" onClick={() => navigate('/atividades')}>
              Voltar
            </GameButton>
          </div>
        </div>
      </div>
    );
  }

  const doneNow = items.filter(
    (activity) => doneIds.has(activity.id) || optimisticDone.has(activity.id),
  ).length;
  const allDone = total > 0 && doneNow === total;

  const leaveRunner = () => navigate('/atividades');

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

    const completingLast =
      openedCompleteRef.current !== true && doneNow + 1 >= total && total > 0;

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
    playCompleteSet();
    const ganho = result.xp_ganho > 0 ? `+${result.xp_ganho} XP` : 'Registrado';
    showGameToast(`${activityName}: ${ganho}`, { variant: 'success' });

    if (completingLast) setCelebrate(true);
  };

  if (celebrate) {
    return (
      <RoutineCompleteScreen routineName={routine.name} onContinue={leaveRunner} />
    );
  }

  return (
    <div className="game-player game-app fixed inset-x-0 top-[var(--top-navbar-height)] bottom-[calc(4.85rem+env(safe-area-inset-bottom,0px))] z-40 flex flex-col overflow-hidden md:right-0 md:bottom-0 md:left-64">
      <AnimatedBackground variant="player" />
      <header className="game-player-hud relative z-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => (allDone ? leaveRunner() : setConfirmExit(true))}
          aria-label={allDone ? 'Fechar rotina' : 'Sair'}
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
          const done = doneIds.has(activity.id) || optimisticDone.has(activity.id);
          const pending = pendingIds.has(activity.id);
          return (
            <li key={activity.id}>
              <GameButton
                variant={done ? 'secondary' : 'primary'}
                className="flex w-full items-center justify-between gap-3"
                disabled={done || pending}
                onClick={() => void handleComplete(activity.id, activity.name)}
              >
                <span className="truncate text-left">{activity.name}</span>
                {pending ? (
                  <Loader2 className="shrink-0 animate-spin" size={18} />
                ) : done ? (
                  <Check className="shrink-0" size={18} />
                ) : null}
              </GameButton>
            </li>
          );
        })}
      </ul>

      <Modal open={confirmExit} onClose={() => setConfirmExit(false)} labelledBy="exit-routine-title">
        <div className="p-4">
          <h2 id="exit-routine-title" className="text-base font-extrabold text-stone-800">
            Sair da rotina?
          </h2>
          <p className="mt-1 text-sm font-semibold text-stone-600">
            Seu progresso de hoje fica salvo.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <GameButton variant="ghost" size="sm" onClick={() => setConfirmExit(false)}>
              Continuar
            </GameButton>
            <GameButton size="sm" onClick={leaveRunner}>
              Sair
            </GameButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
