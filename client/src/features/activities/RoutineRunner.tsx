import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { GameButton } from '@/components/ui/GameButton';
import { PageLoader } from '@/components/ui/PageLoader';
import { WorkoutVictoryScreen } from '@/components/player/WorkoutVictoryScreen';
import { useActivitiesData } from '@/features/activities/useActivitiesData';
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
  const [finished, setFinished] = useState(false);

  const routine = data.routines.find((item) => item.id === routineId);
  const today = getTodaySaoPaulo();
  const doneIds = useMemo(
    () => new Set(data.logs.filter((log) => log.day_key === today).map((log) => log.activity_id)),
    [data.logs, today],
  );

  useEffect(() => {
    if (!data.loading && !routine) navigate('/atividades', { replace: true });
  }, [data.loading, routine, navigate]);

  if (data.loading || !routine) return <PageLoader />;

  const items = (routine.items ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => data.activities.find((activity) => activity.id === item.activity_id))
    .filter(Boolean);

  if (finished) {
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
        <button type="button" onClick={() => navigate('/atividades')} aria-label="Sair">
          <X size={24} />
        </button>
        <p className="text-sm font-extrabold">{routine.name}</p>
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
        <button type="button" className="game-auth-guest-link" onClick={() => setFinished(true)}>
          Encerrar rotina
        </button>
      </div>
    </div>
  );
}
