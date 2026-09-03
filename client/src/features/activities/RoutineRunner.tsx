import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
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

export function RoutineRunnerPage() {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const data = useActivitiesData();
  const { user } = useAuth();
  const [sessionXp, setSessionXp] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const routine = data.routines.find((item) => item.id === routineId);
  const today = getTodaySaoPaulo();
  // Isolado por rotina: só conta logs feitos *nesta* rotina hoje, não qualquer
  // conclusão avulsa da mesma atividade feita fora dela.
  const doneIds = useMemo(() => {
    if (!routine) return new Set<string>();
    const todayLogs = data.logs.filter((log) => log.day_key === today);
    return routineDoneActivityIdsToday(routine, todayLogs);
  }, [data.logs, today, routine]);

  useEffect(() => {
    if (!data.loading && !routine) navigate('/atividades', { replace: true });
  }, [data.loading, routine, navigate]);

  if (data.loading || !routine) return <PageLoader />;

  const items = (routine.items ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => data.activities.find((activity) => activity.id === item.activity_id))
    .filter(Boolean);

  const total = items.length;
  const doneNow = items.filter((activity) => activity && doneIds.has(activity.id)).length;
  const allDone = total > 0 && doneNow === total;

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
          const done = doneIds.has(activity.id);
          return (
            <li key={activity.id}>
              <GameButton
                variant={done ? 'secondary' : 'primary'}
                className="w-full"
                disabled={done || data.busyId === activity.id}
                onClick={() => {
                  void data.complete(activity, { routineId: routine.id }).then((result) => {
                    if (!result) return;
                    setSessionXp((xp) => xp + result.xp_ganho);
                    setDoneCount((count) => count + 1);
                    if (doneNow + 1 >= total) setCelebrate(true);
                  });
                }}
              >
                {done ? `✓ ${activity.name}` : activity.name}
              </GameButton>
            </li>
          );
        })}
      </ul>
      <div className="relative z-10 p-4">
        <button
          type="button"
          className="game-auth-guest-link"
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
