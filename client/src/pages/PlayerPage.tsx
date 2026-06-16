import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Pause, Play, Plus, X } from 'lucide-react';
import { CompletionCelebration } from '@/components/effects/CompletionCelebration';
import { StreakFireCelebration } from '@/components/effects/StreakFireCelebration';
import { GameButton } from '@/components/ui/GameButton';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { useApp } from '@/hooks/useApp';
import { exerciseMediaUrl } from '@/lib/media';
import {
  playBeep,
  playCompleteSet,
  playRestStart,
  playSuccess,
} from '@/lib/sounds';
import { formatTime } from '@/lib/utils';
import { formatExercisePrescription } from '@/types';
import type { ActiveWorkout, WorkoutQueueItem } from '@/types';

type Phase = 'ready' | 'working' | 'resting' | 'done';

const ACTIVE_WORKOUT_KEY = 'abdoria_active_workout';

function readActiveWorkout(): ActiveWorkout | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_WORKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveWorkout;
    if (!parsed.queue?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function PlayerPage() {
  const navigate = useNavigate();
  const { saveWorkout } = useApp();
  const [workout] = useState<ActiveWorkout | null>(readActiveWorkout);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [repsDone, setRepsDone] = useState(0);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [streakCelebration, setStreakCelebration] = useState<number | null>(null);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const startTimeRef = useRef(0);
  const sessionStartedRef = useRef(false);
  const tickHandledRef = useRef(false);

  useEffect(() => {
    if (!workout) {
      navigate('/construtor', { replace: true });
    }
  }, [workout, navigate]);

  const current: WorkoutQueueItem | undefined = workout?.queue[exerciseIndex];
  const totalSeries = current?.series ?? 3;

  const getTargetSeconds = useCallback(() => {
    if (!current) return 30;
    if (current.modo === 'reps') return 0;
    return current.tempo_seg ?? current.tempo_recomendado ?? 30;
  }, [current]);

  const getTargetReps = useCallback(() => {
    if (!current) return 12;
    return current.repeticoes ?? 12;
  }, [current]);

  const getRestSeconds = useCallback(() => {
    if (!current) return 30;
    return current.descanso_seg ?? workout?.config.descanso_padrao_seg ?? 30;
  }, [current, workout]);

  const advanceAfterSeries = useCallback(() => {
    if (!workout || !current) return;

    playCompleteSet();

    if (seriesIndex + 1 < totalSeries) {
      setSeriesIndex((s) => s + 1);
      setPhase('resting');
      setSecondsLeft(getRestSeconds());
      playRestStart();
      setRepsDone(0);
      return;
    }

    if (exerciseIndex + 1 < workout.queue.length) {
      setExerciseIndex((i) => i + 1);
      setSeriesIndex(0);
      setPhase('resting');
      setSecondsLeft(getRestSeconds());
      playRestStart();
      setRepsDone(0);
      setMediaError(false);
      return;
    }

    setPhase('done');
    playSuccess();
  }, [workout, current, seriesIndex, totalSeries, exerciseIndex, getRestSeconds]);

  useEffect(() => {
    if (!workout || paused || phase === 'ready' || phase === 'done') return;
    if (phase === 'working' && current?.modo === 'reps') return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) return 0;
        if (prev <= 5) playBeep(520, 0.05);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [workout, paused, phase, current?.modo]);

  useEffect(() => {
    if (secondsLeft !== 0) {
      tickHandledRef.current = false;
      return;
    }
    if (!workout || paused || phase !== 'resting' || tickHandledRef.current) return;
    tickHandledRef.current = true;
    setPhase('ready');
    setSecondsLeft(0);
  }, [secondsLeft, workout, paused, phase]);

  const startSeries = () => {
    if (!sessionStartedRef.current) {
      startTimeRef.current = Date.now();
      sessionStartedRef.current = true;
    }
    if (current?.modo === 'reps') {
      setRepsDone(0);
      setPhase('working');
    } else {
      setSecondsLeft(getTargetSeconds());
      setPhase('working');
    }
  };

  const completeSeries = () => {
    if (phase !== 'working') return;
    if (current?.modo === 'reps' && repsDone < getTargetReps()) return;
    advanceAfterSeries();
  };

  const addRep = () => {
    if (phase !== 'working' || current?.modo !== 'reps') return;
    setRepsDone((r) => Math.min(r + 1, getTargetReps()));
    playBeep(660, 0.04);
  };

  const skipRest = () => {
    if (phase === 'resting') {
      setPhase('ready');
      setSecondsLeft(0);
    }
  };

  const quitWorkout = () => {
    sessionStorage.removeItem(ACTIVE_WORKOUT_KEY);
    navigate('/construtor', { replace: true });
  };

  const handleFinish = async () => {
    if (!workout || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      const result = await saveWorkout({
        treino_nome: workout.treino_nome,
        treino_tipo: workout.treino_tipo,
        exercicios: workout.queue.map((item) => ({
          exercicio_id: item.exercicio_id ?? '',
          slug: item.slug,
          nome: item.nome,
          duracao_segundos: item.modo === 'tempo' ? (item.tempo_seg ?? item.tempo_recomendado) : (item.repeticoes ?? 12) * 3,
          musculo_principal: item.musculo_principal,
          series: item.series,
          repeticoes_realizadas: item.modo === 'reps' ? item.repeticoes : undefined,
          modo: item.modo,
          descanso_seg: item.descanso_seg,
        })),
        duracao_total_segundos: Math.max(duration, 1),
      });
      setXpGained(result.xp_ganho ?? 0);
      if (result.streak_celebration) {
        setStreakCelebration(result.streak_celebration.streak_atual);
      }
      sessionStorage.removeItem(ACTIVE_WORKOUT_KEY);
      setTimeout(() => navigate('/'), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar treino');
    } finally {
      setSaving(false);
    }
  };

  if (!workout || !current) return null;

  if (phase === 'done') {
    return (
      <div className="game-app fixed inset-0 z-50 flex flex-col items-center justify-center p-6">
        <AnimatedBackground variant="player" />
        <CompletionCelebration />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="game-victory relative z-10">
          {streakCelebration !== null ? (
            <StreakFireCelebration streak={streakCelebration} />
          ) : (
            <div className="game-level-badge mx-auto mb-4">✓</div>
          )}
          <h2 className="game-victory__title">MISSÃO COMPLETA!</h2>
          <p className="mt-2 text-sm font-bold text-stone-600">{workout.treino_nome}</p>
          {xpGained > 0 && <p className="game-victory__xp">+{xpGained} XP</p>}
          {saveError && <p className="mt-4 game-login__error">{saveError}</p>}
          <GameButton onClick={handleFinish} size="lg" className="mt-6 w-full" disabled={saving}>
            {saving ? 'Salvando...' : xpGained > 0 ? 'Voltar à base' : 'Salvar e voltar'}
          </GameButton>
        </motion.div>
      </div>
    );
  }

  const targetReps = getTargetReps();
  const prescription = formatExercisePrescription(current);
  const progressPct =
    phase === 'working' && current.modo === 'tempo' && getTargetSeconds() > 0
      ? ((getTargetSeconds() - secondsLeft) / getTargetSeconds()) * 100
      : phase === 'working' && current.modo === 'reps'
        ? (repsDone / targetReps) * 100
        : phase === 'resting' && getRestSeconds() > 0
          ? ((getRestSeconds() - secondsLeft) / getRestSeconds()) * 100
          : 0;

  return (
    <div className="game-app fixed inset-0 z-50 flex flex-col">
      <AnimatedBackground variant="player" />
      <header className="game-player-hud relative flex items-center justify-between">
        <button type="button" onClick={() => setShowQuitModal(true)} className="cursor-pointer font-bold text-stone-600" aria-label="Desistir do treino">
          <X size={24} />
        </button>
        <div className="text-center">
          <p className="game-page-header__eyebrow !mb-0">{workout.treino_nome}</p>
          <p className="text-xs font-extrabold text-stone-800">
            {exerciseIndex + 1}/{workout.queue.length} · Série {seriesIndex + 1}/{totalSeries}
          </p>
        </div>
        <button type="button" onClick={() => setPaused((p) => !p)} className="cursor-pointer text-stone-600" disabled={phase === 'ready'} aria-label={paused ? 'Retomar' : 'Pausar'}>
          {paused ? <Play size={24} /> : <Pause size={24} />}
        </button>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <AnimatePresence mode="wait">
          <motion.div key={`${current.slug}-${exerciseIndex}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
            <div className="game-player-frame relative mx-auto aspect-square w-full max-w-xs">
              {!mediaError ? (
                <img src={exerciseMediaUrl(current.slug)} alt={current.nome} className="h-full w-full object-cover" onError={() => setMediaError(true)} />
              ) : (
                <div className="flex h-full items-center justify-center text-5xl font-extrabold text-emerald-200">{current.nome[0]}</div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="text-center">
          <h2 className="game-page-header__title !text-base">{current.nome}</h2>
          <p className="mt-1 text-[0.65rem] font-extrabold uppercase tracking-wide text-emerald-700">
            Meta: {prescription}
          </p>
          <p className="mt-2 text-xs font-extrabold text-stone-600">
            {phase === 'ready' && (current.modo === 'reps' ? `Faça ${targetReps} reps · série ${seriesIndex + 1}` : `Segure ${getTargetSeconds()}s · série ${seriesIndex + 1}`)}
            {phase === 'working' && (current.modo === 'reps' ? `${repsDone}/${targetReps} reps` : formatTime(secondsLeft))}
            {phase === 'resting' && `Descanso ${formatTime(secondsLeft)} · próxima: série ${seriesIndex + 1 < totalSeries ? seriesIndex + 2 : 1}`}
          </p>
        </div>

        <div className="relative">
          <svg className="h-40 w-40 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#e7e5e4" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke={phase === 'resting' ? '#0284c7' : '#059669'}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${progressPct * 2.83} 283`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {phase === 'working' && current.modo === 'reps' ? (
              <span className="game-timer-ring__label tabular-nums">{repsDone}</span>
            ) : phase !== 'ready' ? (
              <span className="game-timer-ring__label tabular-nums">{formatTime(secondsLeft)}</span>
            ) : (
              <Play size={36} className="text-emerald-500" />
            )}
          </div>
        </div>

        {paused && <p className="text-sm font-bold text-amber-600">Pausado</p>}
      </div>

      <div className="flex flex-col gap-3 p-6">
        {phase === 'ready' && (
          <GameButton size="lg" className="w-full" onClick={startSeries}>
            INICIAR SÉRIE {seriesIndex + 1}
          </GameButton>
        )}
        {phase === 'working' && current.modo === 'reps' && (
          <div className="flex gap-3">
            <GameButton variant="secondary" size="lg" className="flex-1 flex items-center justify-center gap-2" onClick={addRep} disabled={repsDone >= targetReps}>
              <Plus size={22} /> +1 rep
            </GameButton>
            <GameButton size="lg" className="flex-1" onClick={completeSeries} disabled={repsDone < targetReps}>
              Concluir ({repsDone}/{targetReps})
            </GameButton>
          </div>
        )}
        {phase === 'working' && current.modo === 'tempo' && (
          <GameButton size="lg" className="w-full" onClick={completeSeries}>
            Concluir série
          </GameButton>
        )}
        {phase === 'resting' && (
          <GameButton variant="secondary" size="lg" className="w-full" onClick={skipRest}>
            Pular descanso
          </GameButton>
        )}
        <GameButton variant="secondary" size="lg" className="w-full flex items-center justify-center gap-2 text-red-700" onClick={() => setShowQuitModal(true)}>
          <LogOut size={18} /> Desistir do treino
        </GameButton>
      </div>

      <AnimatePresence>
        {showQuitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="game-victory w-full max-w-sm !p-6"
            >
              <h3 className="game-victory__title !text-base">Desistir do treino?</h3>
              <p className="mt-2 text-sm font-bold text-stone-600">
                O progresso desta sessão não será salvo. Você pode recomeçar no construtor.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <GameButton variant="secondary" size="lg" className="w-full" onClick={() => setShowQuitModal(false)}>
                  Continuar treinando
                </GameButton>
                <GameButton size="lg" className="w-full !bg-red-600 hover:!bg-red-700" onClick={quitWorkout}>
                  Sim, desistir
                </GameButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
