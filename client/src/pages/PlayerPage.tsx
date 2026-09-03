import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Hourglass,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Timer,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { QuitWorkoutModal } from '@/components/player/QuitWorkoutModal';
import { PlayerPauseOverlay } from '@/components/player/PlayerPauseOverlay';
import { WorkoutTimerRing } from '@/components/player/WorkoutTimerRing';
import { WorkoutVictoryScreen } from '@/components/player/WorkoutVictoryScreen';
import { WorkoutRecoveryModal } from '@/components/player/WorkoutRecoveryModal';
import { WorkoutCompanionLayer, WorkoutScene } from '@/components/player/WorkoutScene';
import { ExerciseDemo } from '@/components/exercises/ExerciseDemo';
import { ExerciseGuideSheet } from '@/components/exercises/ExerciseGuideSheet';
import { shouldPauseWorkoutForGuide } from '@shared/workout-player';
import { GameButton } from '@/components/ui/GameButton';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/hooks/useAuth';
import {
  playBeep,
  playCompleteSet,
  playRestStart,
  playRestEnd,
  playTimerDone,
  playWorkoutComplete,
  setSoundSettings,
} from '@/lib/sounds';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/lib/game-toast';
import { getRecommendWorkout, updateMe } from '@/lib/api';
import {
  clearWorkoutDurationSession,
  computeWorkoutElapsedSeconds,
  persistWorkoutEndedAt,
  persistWorkoutPausedMs,
  persistWorkoutStartedAt,
  readWorkoutEndedAt,
  readWorkoutPausedMs,
  readWorkoutStartedAt,
} from '@/lib/workout-duration';
import {
  formatExercisePrescription,
  resolveCosmeticos,
  type LevelUpCelebration as LevelUpData,
} from '@/types';
import type { ActiveWorkout, WorkoutQueueItem, XpBreakdown } from '@/types';
import { readWorkoutOrLegacy, webWorkoutSessionStorage } from '@/lib/workout-session-storage';
import { keepScreenAwake } from '@/lib/platform/screen-awake';
import { actionHaptic } from '@/lib/platform/native-runtime';

const REST_ADJUST_STEP_SEC = 5;

type Phase = 'ready' | 'working' | 'side_transition' | 'resting' | 'done';

function sideInstruction(item: WorkoutQueueItem | undefined, sideIndex: 0 | 1): string | null {
  if (!item || item.laterality !== 'per_side') return null;
  return sideIndex === 0 ? 'Lado esquerdo' : 'Lado direito';
}

export function PlayerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveWorkout, exercises } = useApp();
  const { user: authUser } = useAuth();
  const [initialSnapshot] = useState(readWorkoutOrLegacy);
  const resumeRequested = Boolean(
    (location.state as { resumingWorkout?: boolean } | null)?.resumingWorkout,
  );
  const isRecoveryStart = Boolean(initialSnapshot?.startedAt && !resumeRequested);
  const [workout] = useState<ActiveWorkout | null>(initialSnapshot?.workout ?? null);
  const [exerciseIndex, setExerciseIndex] = useState(initialSnapshot?.exerciseIndex ?? 0);
  const [setIndex, setSetIndex] = useState(initialSnapshot?.setIndex ?? 0);
  const seriesIndex = setIndex;
  const setSeriesIndex = setSetIndex;
  const [sideIndex, setSideIndex] = useState<0 | 1>(initialSnapshot?.sideIndex ?? 0);
  const [phase, setPhase] = useState<Phase>((initialSnapshot?.phase as Phase) ?? 'ready');
  const [secondsLeft, setSecondsLeft] = useState(initialSnapshot?.secondsLeft ?? 0);
  const [restTotalSec, setRestTotalSec] = useState(
    initialSnapshot?.phase === 'resting'
      ? (initialSnapshot.timerTotalSeconds ?? initialSnapshot.secondsLeft)
      : 0,
  );
  const [paused, setPaused] = useState(isRecoveryStart || (initialSnapshot?.paused ?? false));
  const [recoveringWorkout, setRecoveringWorkout] = useState(isRecoveryStart);
  const [saving, setSaving] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [coinsGained, setCoinsGained] = useState(0);
  const [workoutDurationSeconds, setWorkoutDurationSeconds] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<XpBreakdown | null>(null);
  const [streakCelebration, setStreakCelebration] = useState<number | null>(null);
  const [levelUpCelebration, setLevelUpCelebration] = useState<LevelUpData | null>(null);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showExerciseGuide, setShowExerciseGuide] = useState(false);
  const [showRodadaModal, setShowRodadaModal] = useState(false);
  const [rodadaBusy, setRodadaBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [muted, setMuted] = useState(() => !(authUser?.preferencias?.som_habilitado ?? true));
  const [countdownEnabled, setCountdownEnabled] = useState(
    () => authUser?.preferencias?.contagem_regressiva_habilitada ?? true,
  );
  /** 3, 2, 1 antes de um exercício de tempo começar; null = sem contagem rolando. */
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const mutedRef = useRef(muted);
  const countdownEnabledRef = useRef(countdownEnabled);
  const equippedEffectId = resolveCosmeticos(authUser?.cosmeticos).efeito_equipado;
  const prefsRef = useRef(authUser?.preferencias);
  const startTimeRef = useRef(initialSnapshot?.startedAt ?? 0);
  const endTimeRef = useRef(0);
  const pausedMsRef = useRef(initialSnapshot?.pausedMs ?? 0);
  const [recoveredOfflineMs] = useState(() =>
    isRecoveryStart && initialSnapshot ? Math.max(0, Date.now() - initialSnapshot.updatedAt) : 0,
  );
  const recoveredOfflineMsRef = useRef(recoveredOfflineMs);
  const pauseStartedRef = useRef<number | null>(null);
  const sessionStartedRef = useRef(false);
  const tickHandledRef = useRef(false);
  const spokenSideRef = useRef('');
  const sessionIdRef = useRef(initialSnapshot?.sessionId ?? crypto.randomUUID());

  useEffect(() => {
    mutedRef.current = muted;
    prefsRef.current = authUser?.preferencias;
    setSoundSettings(!muted, authUser?.preferencias?.sfx_volume ?? 0.7);
  }, [muted, authUser?.preferencias]);

  useEffect(() => {
    countdownEnabledRef.current = countdownEnabled;
  }, [countdownEnabled]);

  useEffect(() => keepScreenAwake(), []);

  useEffect(() => {
    return () => {
      const prefs = prefsRef.current;
      if (!prefs) return;
      void updateMe({
        preferencias: {
          ...prefs,
          som_habilitado: !mutedRef.current,
          contagem_regressiva_habilitada: countdownEnabledRef.current,
        },
      });
    };
  }, []);

  useEffect(() => {
    if (!workout) return;

    const storedStart = readWorkoutStartedAt() || initialSnapshot?.startedAt || 0;
    if (storedStart) {
      startTimeRef.current = storedStart;
      sessionStartedRef.current = true;
    }

    pausedMsRef.current = readWorkoutPausedMs() || initialSnapshot?.pausedMs || 0;
    const storedEnd = readWorkoutEndedAt();
    if (storedEnd) {
      endTimeRef.current = storedEnd;
    }
  }, [workout, initialSnapshot]);

  useEffect(() => {
    if (!workout || phase === 'done') return;
    webWorkoutSessionStorage.write({
      version: 2,
      sessionId: sessionIdRef.current,
      workout,
      exerciseIndex,
      setIndex,
      sideIndex,
      phase,
      secondsLeft,
      timerTotalSeconds: phase === 'resting' ? restTotalSec : undefined,
      paused,
      startedAt: startTimeRef.current,
      pausedMs: pausedMsRef.current,
      updatedAt: Date.now(),
    });
  }, [workout, exerciseIndex, setIndex, sideIndex, phase, secondsLeft, restTotalSec, paused]);

  useEffect(() => {
    if (!workout) {
      navigate('/treino', { replace: true });
    }
  }, [workout, navigate]);

  const current: WorkoutQueueItem | undefined = workout?.queue[exerciseIndex];
  const currentExerciseDefinition = current
    ? exercises.find((exercise) => exercise.slug === current.slug)
    : undefined;
  const totalSeries = current?.series ?? 3;
  const currentSideInstruction = sideInstruction(current, sideIndex);

  useEffect(() => {
    if (!current || !currentSideInstruction || muted || phase !== 'ready') return;
    const key = `${current.slug}:${seriesIndex}:${sideIndex}`;
    if (spokenSideRef.current === key || !('speechSynthesis' in window)) return;
    spokenSideRef.current = key;
    const utterance = new SpeechSynthesisUtterance(currentSideInstruction);
    utterance.lang = 'pt-BR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [current, currentSideInstruction, muted, phase, seriesIndex, sideIndex]);

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

  const startRest = useCallback((restSec: number) => {
    setRestTotalSec(restSec);
    setSecondsLeft(restSec);
    setPhase('resting');
    setPaused(false);
    playRestStart();
  }, []);

  const advanceAfterSeries = useCallback(() => {
    if (!workout || !current) return;

    playCompleteSet();

    if (current.laterality === 'per_side' && sideIndex === 0) {
      setPhase('side_transition');
      setSecondsLeft(0);
      setPaused(false);
      return;
    }

    if (seriesIndex + 1 < totalSeries) {
      setSetIndex((s) => s + 1);
      setSideIndex(0);
      startRest(getRestSeconds());
      return;
    }

    if (exerciseIndex + 1 < workout.queue.length) {
      setExerciseIndex((i) => i + 1);
      setSetIndex(0);
      setSideIndex(0);
      startRest(getRestSeconds());
      return;
    }

    endTimeRef.current = persistWorkoutEndedAt();
    playWorkoutComplete();
    // Atividades anexadas, quando existirem, são oferecidas após a conclusão.
    setPhase('done');
  }, [
    workout,
    current,
    sideIndex,
    seriesIndex,
    totalSeries,
    exerciseIndex,
    getRestSeconds,
    startRest,
  ]);

  const runsCountdown = phase === 'resting' || (phase === 'working' && current?.modo === 'tempo');

  useEffect(() => {
    if (!workout || paused || !runsCountdown) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) return 0;
        if (phase === 'resting' && prev <= 5) playBeep(520, 0.05);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [workout, paused, runsCountdown, phase]);

  useEffect(() => {
    if (secondsLeft !== 0) {
      tickHandledRef.current = false;
      return;
    }
    if (!workout || paused || tickHandledRef.current) return;

    if (phase === 'resting') {
      tickHandledRef.current = true;
      playRestEnd();
      setPhase('ready');
      setSecondsLeft(0);
      setRestTotalSec(0);
      return;
    }

    if (phase === 'working' && current?.modo === 'tempo') {
      tickHandledRef.current = true;
      playTimerDone();
      advanceAfterSeries();
    }
  }, [secondsLeft, workout, paused, phase, current?.modo, advanceAfterSeries]);

  const markSessionStarted = () => {
    if (!sessionStartedRef.current) {
      startTimeRef.current = persistWorkoutStartedAt();
      sessionStartedRef.current = true;
    }
  };

  const startSeries = () => {
    if (current?.modo === 'reps') {
      markSessionStarted();
      setPaused(false);
      setPhase('working');
      return;
    }
    if (countdownEnabled) {
      setCountdownValue(3);
      return;
    }
    markSessionStarted();
    setPaused(false);
    setSecondsLeft(getTargetSeconds());
    setPhase('working');
  };

  // Contagem 3-2-1 antes de um exercício de tempo — só depois dela o
  // cronômetro real da série começa a valer.
  useEffect(() => {
    if (countdownValue === null) return;
    if (countdownValue === 0) {
      setCountdownValue(null);
      markSessionStarted();
      setPaused(false);
      setSecondsLeft(getTargetSeconds());
      setPhase('working');
      return;
    }
    playBeep(660, 0.08);
    const id = window.setTimeout(() => setCountdownValue((v) => (v === null ? null : v - 1)), 800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage ao próprio tick; markSessionStarted/getTargetSeconds são estáveis o bastante pro efeito
  }, [countdownValue]);

  const completeSeries = () => {
    if (phase !== 'working') return;
    advanceAfterSeries();
  };

  const continueAfterSideTransition = () => {
    setSideIndex(1);
    setPhase('ready');
    setSecondsLeft(0);
    setPaused(false);
  };

  const resetForNavigation = () => {
    if (pauseStartedRef.current) {
      pausedMsRef.current += Date.now() - pauseStartedRef.current;
      pauseStartedRef.current = null;
      persistWorkoutPausedMs(pausedMsRef.current);
    }

    tickHandledRef.current = false;
    setPhase('ready');
    setSecondsLeft(0);
    setRestTotalSec(0);
    setPaused(false);
    setCountdownValue(null);
  };

  const goBackOneStep = () => {
    if (!workout || (exerciseIndex === 0 && seriesIndex === 0 && sideIndex === 0)) return;
    resetForNavigation();

    if (sideIndex === 1) {
      setSideIndex(0);
      return;
    }

    if (seriesIndex > 0) {
      setSeriesIndex((index) => Math.max(index - 1, 0));
      return;
    }

    const previousIndex = Math.max(exerciseIndex - 1, 0);
    const previousSeries = Math.max((workout.queue[previousIndex]?.series ?? 1) - 1, 0);
    setExerciseIndex(previousIndex);
    setSeriesIndex(previousSeries);
    setSideIndex(workout.queue[previousIndex]?.laterality === 'per_side' ? 1 : 0);
  };

  const goToNextExercise = () => {
    if (!workout || !current) return;
    resetForNavigation();
    if (exerciseIndex + 1 < workout.queue.length) {
      setExerciseIndex((index) => index + 1);
      setSeriesIndex(0);
      setSideIndex(0);
      return;
    }
    endTimeRef.current = persistWorkoutEndedAt();
    playWorkoutComplete();
    setPhase('done');
  };

  const skipRest = () => {
    if (phase !== 'resting') return;
    tickHandledRef.current = true;
    setPhase('ready');
    setSecondsLeft(0);
    setRestTotalSec(0);
    setPaused(false);
  };

  const adjustRestSeconds = (delta: number) => {
    setSecondsLeft((currentLeft) => {
      const elapsed = Math.max(0, restTotalSec - currentLeft);
      const nextLeft = Math.max(0, currentLeft + delta);
      setRestTotalSec(Math.max(1, elapsed + nextLeft));
      return nextLeft;
    });
    void actionHaptic();
  };

  /** Reinicia o cronômetro da fase atual (exercício de tempo ou descanso) do zero. */
  const resetTimer = () => {
    if (phase === 'resting') {
      tickHandledRef.current = false;
      setSecondsLeft(restTotalSec);
      setPaused(false);
      return;
    }
    if (phase === 'working' && current?.modo === 'tempo') {
      tickHandledRef.current = false;
      setSecondsLeft(getTargetSeconds());
      setPaused(false);
    }
  };

  const togglePause = () => {
    if (phase === 'ready' || phase === 'done') return;
    setPaused((value) => {
      const next = !value;
      if (next) {
        pauseStartedRef.current = Date.now();
      } else if (pauseStartedRef.current) {
        pausedMsRef.current += Date.now() - pauseStartedRef.current;
        pauseStartedRef.current = null;
        persistWorkoutPausedMs(pausedMsRef.current);
      }
      return next;
    });
  };

  const openExerciseGuide = () => {
    const shouldPause = current && shouldPauseWorkoutForGuide(phase, current.modo, paused);
    if (shouldPause) {
      pauseStartedRef.current = Date.now();
      setPaused(true);
    }
    setShowExerciseGuide(true);
  };

  const quitWorkout = () => {
    webWorkoutSessionStorage.clear();
    clearWorkoutDurationSession();
    navigate('/treino', { replace: true });
  };

  const resumeRecoveredWorkout = () => {
    if (recoveredOfflineMsRef.current > 0) {
      pausedMsRef.current += recoveredOfflineMsRef.current;
      persistWorkoutPausedMs(pausedMsRef.current);
      recoveredOfflineMsRef.current = 0;
    }
    setRecoveringWorkout(false);
    setPaused(false);
    void actionHaptic();
  };

  /** Atalho administrativo usado para validar a conclusão do treino. */
  const skipAllForTests = () => {
    endTimeRef.current = Date.now();
    persistWorkoutEndedAt(endTimeRef.current);
    playWorkoutComplete();
    setPhase('done');
  };

  const handleFinish = async () => {
    if (!workout || saving || saved) return;
    setSaving(true);
    try {
      const duration = computeWorkoutElapsedSeconds({
        workout,
        startedAt: startTimeRef.current || readWorkoutStartedAt(),
        endedAt: endTimeRef.current || readWorkoutEndedAt(),
        pausedMs: pausedMsRef.current,
        pauseStartedAt: pauseStartedRef.current,
      });
      setWorkoutDurationSeconds(Math.max(duration, 1));
      const result = await saveWorkout({
        completion_id: sessionIdRef.current,
        treino_nome: workout.treino_nome,
        treino_tipo: workout.treino_tipo,
        plano_dia_indice: workout.plano_dia_indice,
        exercicios: workout.queue.map((item) => ({
          exercicio_id: item.exercicio_id ?? '',
          slug: item.slug,
          nome: item.nome,
          duracao_segundos:
            item.modo === 'tempo'
              ? (item.tempo_seg ?? item.tempo_recomendado)
              : (item.repeticoes ?? 12) * 3,
          musculo_principal: item.musculo_principal,
          series: item.series,
          repeticoes_realizadas: item.modo === 'reps' ? item.repeticoes : undefined,
          modo: item.modo,
          descanso_seg: item.descanso_seg,
        })),
        duracao_total_segundos: Math.max(duration, 1),
      });
      setXpGained(result.xp_ganho ?? 0);
      setCoinsGained(result.abdoria_ganha ?? 0);
      setXpBreakdown(result.xp_breakdown ?? null);
      if (result.streak_celebration) {
        setStreakCelebration(result.streak_celebration.streak_atual);
      }
      if (result.level_up) {
        setLevelUpCelebration(result.level_up);
      }
      webWorkoutSessionStorage.clear();
      clearWorkoutDurationSession();
      setSaved(true);
      if (result.rodada_completa) {
        setShowRodadaModal(true);
      }
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível salvar seu treino. Tente novamente.'), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const finishTriggeredRef = useRef(false);
  useEffect(() => {
    // Salva o treino assim que os exercícios terminam — sem esperar o
    // usuário tocar em nada, mantendo a conclusão imediata e previsível.
    if (phase === 'done' && !finishTriggeredRef.current) {
      finishTriggeredRef.current = true;
      void handleFinish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na transição de fase, handleFinish já se protege com `saving`/`saved`
  }, [phase]);

  const continueAfterWorkout = () => {
    navigate('/');
  };

  const handleRodadaManter = () => {
    setShowRodadaModal(false);
  };

  const handleRodadaTrocar = async () => {
    setRodadaBusy(true);
    try {
      const treino = await getRecommendWorkout({
        shuffle: true,
        excludePresetId: workout?.preset_id ?? null,
      });
      setShowRodadaModal(false);
      navigate(`/treino?preset=${treino.preset_id}`);
    } catch {
      setShowRodadaModal(false);
      navigate('/treino');
    } finally {
      setRodadaBusy(false);
    }
  };

  if (!workout || !current) return null;

  if (phase === 'done') {
    return (
      <WorkoutVictoryScreen
        workoutName={workout.treino_nome}
        durationSeconds={workoutDurationSeconds}
        exerciseCount={workout.queue.length}
        setCount={workout.queue.reduce((total, item) => total + item.series, 0)}
        xpGained={xpGained}
        abdoriaGained={coinsGained}
        xpBreakdown={xpBreakdown}
        streakCelebration={streakCelebration}
        levelUpCelebration={levelUpCelebration}
        equippedEffectId={equippedEffectId}
        saving={saving}
        saved={saved}
        onFinish={() => void handleFinish()}
        onContinue={continueAfterWorkout}
        showRodadaModal={showRodadaModal}
        rodadaBusy={rodadaBusy}
        onRodadaKeep={handleRodadaManter}
        onRodadaSwap={() => void handleRodadaTrocar()}
      />
    );
  }

  const targetReps = getTargetReps();
  const targetSeconds = getTargetSeconds();
  const prescription = formatExercisePrescription(current);
  const currentName = current.nome;
  // During rest the indices already point to the next step, whether that is
  // another set of this exercise or the first set of the next exercise.
  const nextSeriesLabel = `${currentName} · série ${seriesIndex + 1}`;

  const progressPct =
    phase === 'working' && current.modo === 'tempo' && targetSeconds > 0
      ? ((targetSeconds - secondsLeft) / targetSeconds) * 100
      : phase === 'working' && current.modo === 'reps'
        ? ((seriesIndex + 1) / totalSeries) * 100
        : phase === 'resting' && restTotalSec > 0
          ? Math.min(100, Math.max(0, ((restTotalSec - secondsLeft) / restTotalSec) * 100))
          : 0;

  const canTogglePause = phase === 'resting' || (phase === 'working' && current.modo === 'tempo');

  const phaseBadge =
    phase === 'resting' ? (
      <span className="game-player-phase game-player-phase--rest">
        <Timer size={14} /> Descanso
      </span>
    ) : phase === 'side_transition' ? (
      <span className="game-player-phase game-player-phase--ready">Troca de lado</span>
    ) : phase === 'working' ? (
      <span className="game-player-phase game-player-phase--work">
        Série {seriesIndex + 1} de {totalSeries}
      </span>
    ) : (
      <span className="game-player-phase game-player-phase--ready">
        Pronto para a série {seriesIndex + 1}
      </span>
    );

  const statusText =
    phase === 'ready'
      ? current.modo === 'reps'
        ? `Faça ${targetReps} repetições quando iniciar a série ${seriesIndex + 1}.`
        : `Segure por ${targetSeconds}s na série ${seriesIndex + 1}.`
      : phase === 'working'
        ? current.modo === 'reps'
          ? `Meta: ${targetReps} repetições · toque em "Série concluída" ao terminar.`
          : `Segure a posição · o tempo conta sozinho.`
        : null;

  return (
    <WorkoutScene companion={<WorkoutCompanionLayer />}>
      <div
        className={`game-player game-player--${phase} game-app fixed inset-0 z-50 flex flex-col overflow-hidden`}
      >
        <header className="game-player-hud relative z-10 shrink-0 flex items-center justify-between">
          <motion.button
            type="button"
            onClick={() => setShowQuitModal(true)}
            className="game-player-close"
            aria-label="Desistir do treino"
            whileTap={{ scale: 0.88, rotate: -8 }}
          >
            <X size={24} />
          </motion.button>
          <div className="game-player-hud__title text-center">
            <strong>Treinando</strong>
          </div>
          <div className="flex items-center gap-3">
            {authUser?.role === 'admin' && (
              <motion.button
                type="button"
                onClick={skipAllForTests}
                className="game-player-toggle game-player-admin-skip"
                title="Pular direto pro fim do treino (só admins, para testes)"
                whileTap={{ scale: 0.88, rotate: -4 }}
              >
                SKIP
              </motion.button>
            )}
            <motion.button
              type="button"
              onClick={() => setCountdownEnabled((v) => !v)}
              className={`game-player-toggle${countdownEnabled ? ' game-player-toggle--on' : ''}`}
              aria-label={
                countdownEnabled
                  ? 'Desativar contagem regressiva antes dos exercícios'
                  : 'Ativar contagem regressiva antes dos exercícios'
              }
              aria-pressed={countdownEnabled}
              title={
                countdownEnabled ? 'Contagem regressiva ativada' : 'Contagem regressiva desativada'
              }
              whileTap={{ scale: 0.84, rotate: 12 }}
              onTap={() => void actionHaptic()}
            >
              <Hourglass size={18} />
            </motion.button>
            <motion.button
              type="button"
              onClick={() => {
                const next = !muted;
                setMuted(next);
                setSoundSettings(!next, authUser?.preferencias?.sfx_volume ?? 0.7);
              }}
              className={`game-player-toggle${!muted ? ' game-player-toggle--on' : ''}`}
              aria-label={muted ? 'Ativar sons' : 'Silenciar sons'}
              aria-pressed={!muted}
              title={muted ? 'Som desativado' : 'Som ativado'}
              whileTap={{ scale: 0.84, rotate: muted ? -12 : 12 }}
              onTap={() => void actionHaptic()}
            >
              {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </motion.button>
          </div>
        </header>

        <nav
          className="game-player-progress relative z-10 shrink-0"
          aria-label="Progresso do treino"
        >
          <div
            className="flex gap-1 px-4 pb-1 sm:px-6"
            role="progressbar"
            aria-valuenow={exerciseIndex + 1}
            aria-valuemin={1}
            aria-valuemax={workout.queue.length}
            aria-label={`Exercício ${exerciseIndex + 1} de ${workout.queue.length}`}
          >
            {workout.queue.map((item, i) => (
              <span
                key={`${item.slug}-${i}`}
                className={`game-progress-dot flex-1 rounded-full ${
                  i < exerciseIndex
                    ? 'game-progress-dot--done'
                    : i === exerciseIndex
                      ? 'game-progress-dot--active'
                      : 'game-progress-dot--todo'
                }`}
              />
            ))}
          </div>
        </nav>

        <main className="game-player-body relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
          <div className="game-player-content flex flex-col items-center gap-2 px-4 py-2 sm:gap-4 sm:px-6 sm:py-4">
            <div className="game-player-status-row">
              {phaseBadge}
              {(exerciseIndex > 0 || seriesIndex > 0 || sideIndex > 0) && (
                <button type="button" className="game-player-backstep" onClick={goBackOneStep}>
                  <ChevronLeft size={16} aria-hidden />
                  {sideIndex > 0
                    ? 'Lado anterior'
                    : seriesIndex > 0
                      ? 'Série anterior'
                      : 'Exercício anterior'}
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${current.slug}-${exerciseIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="game-player-media-shell w-full max-w-sm"
              >
                <ExerciseDemo
                  name={currentName}
                  mediaFile={currentExerciseDefinition?.media?.gif ?? `${current.slug}.gif`}
                  className="game-player-frame"
                  decorative
                />
              </motion.div>
            </AnimatePresence>

            <div className="game-player-exercise-info w-full text-center">
              <p className="game-player-prescription">
                {phase === 'resting' ? 'A seguir' : `Meta · ${prescription}`}
              </p>
              <div className="game-player-exercise-title">
                <h2>{currentName}</h2>
                {currentExerciseDefinition && (
                  <button
                    type="button"
                    onClick={openExerciseGuide}
                    aria-label={`Como fazer ${currentName}`}
                  >
                    <CircleHelp size={19} aria-hidden />
                    <span>Como fazer</span>
                  </button>
                )}
              </div>
              {phase === 'resting' ? (
                <p className="game-player-rest-next">Prepare-se para {nextSeriesLabel}</p>
              ) : (
                statusText && (
                  <>
                    {currentSideInstruction && (
                      <p
                        className="mx-auto mt-1.5 max-w-xs text-center text-sm font-extrabold text-emerald-700"
                        aria-live="polite"
                      >
                        {currentSideInstruction}
                      </p>
                    )}
                    <p className="game-player-status-copy">{statusText}</p>
                  </>
                )
              )}
            </div>

            {phase === 'side_transition' ? (
              <div className="game-player-side-transition" role="status" aria-live="assertive">
                <ChevronRight size={34} aria-hidden />
                <strong>Troque de lado</strong>
                <span>A série {seriesIndex + 1} continua no lado direito.</span>
              </div>
            ) : (
              <div className="game-player-metric relative">
                <div
                  className={
                    phase === 'resting'
                      ? 'grid grid-cols-[auto_1fr_auto] items-center gap-3'
                      : 'contents'
                  }
                >
                  {phase === 'resting' && (
                    <button
                      type="button"
                      className="game-rest-adjust-btn"
                      aria-label="Menos 5 segundos"
                      onClick={() => adjustRestSeconds(-REST_ADJUST_STEP_SEC)}
                    >
                      −{REST_ADJUST_STEP_SEC}s
                    </button>
                  )}
                  <WorkoutTimerRing
                    phase={phase as 'ready' | 'working' | 'resting'}
                    modo={current.modo}
                    secondsLeft={secondsLeft}
                    seriesIndex={seriesIndex}
                    totalSeries={totalSeries}
                    targetReps={targetReps}
                    progressPct={progressPct}
                    paused={paused}
                    onCenterClick={
                      phase === 'ready' ? startSeries : canTogglePause ? togglePause : undefined
                    }
                    clickLabel={
                      phase === 'ready'
                        ? `Iniciar série ${seriesIndex + 1}`
                        : paused
                          ? 'Continuar cronômetro'
                          : 'Pausar cronômetro'
                    }
                  />
                  {phase === 'resting' && (
                    <button
                      type="button"
                      className="game-rest-adjust-btn"
                      aria-label="Mais 5 segundos"
                      onClick={() => adjustRestSeconds(REST_ADJUST_STEP_SEC)}
                    >
                      +{REST_ADJUST_STEP_SEC}s
                    </button>
                  )}
                </div>

                {countdownValue !== null && countdownValue > 0 && (
                  <div className="game-countdown-overlay" role="status" aria-live="assertive">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={countdownValue}
                        className="game-countdown-overlay__number"
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                      >
                        {countdownValue}
                      </motion.span>
                    </AnimatePresence>
                    <span className="game-countdown-overlay__hint">Prepare-se...</span>
                  </div>
                )}
              </div>
            )}

            {paused && canTogglePause && (
              <p className="game-player-paused">
                <Pause size={14} /> Cronômetro pausado · use o botão abaixo para continuar
              </p>
            )}
          </div>

          <div className="game-player-actions mt-auto flex shrink-0 flex-col gap-2 px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:gap-3 sm:px-6 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            {phase === 'ready' && (
              <GameButton
                size="lg"
                className="w-full flex items-center justify-center gap-2"
                onClick={startSeries}
              >
                <Play size={20} fill="currentColor" />
                Iniciar série {seriesIndex + 1}
                {current.laterality === 'per_side'
                  ? ` · ${sideIndex === 0 ? 'esquerdo' : 'direito'}`
                  : ''}
              </GameButton>
            )}

            {phase === 'side_transition' && (
              <GameButton
                size="lg"
                className="w-full flex items-center justify-center gap-2"
                onClick={continueAfterSideTransition}
              >
                Pronto, iniciar lado direito <ChevronRight size={20} />
              </GameButton>
            )}

            {phase === 'working' && current.modo === 'reps' && (
              <GameButton
                size="lg"
                className="w-full flex items-center justify-center gap-2"
                onClick={completeSeries}
              >
                <Check size={22} />
                Série concluída
              </GameButton>
            )}

            {phase === 'working' && current.modo === 'tempo' && (
              <div className="flex gap-2">
                <GameButton
                  size="lg"
                  className="flex-[8] flex items-center justify-center gap-2"
                  variant={paused ? 'primary' : 'secondary'}
                  onClick={togglePause}
                >
                  {paused ? (
                    <>
                      <Play size={20} fill="currentColor" /> Continuar exercício
                    </>
                  ) : (
                    <>
                      <Pause size={20} /> Pausar exercício
                    </>
                  )}
                </GameButton>
                <GameButton
                  size="lg"
                  variant="ghost"
                  className="flex-[2] flex items-center justify-center"
                  onClick={resetTimer}
                  aria-label="Reiniciar cronômetro do exercício"
                  title="Reiniciar cronômetro"
                >
                  <RotateCcw size={18} />
                </GameButton>
              </div>
            )}

            {phase === 'working' && current.modo === 'tempo' && (
              <GameButton
                size="lg"
                variant="secondary"
                className="w-full flex items-center justify-center gap-2"
                onClick={goToNextExercise}
              >
                {exerciseIndex + 1 < workout.queue.length ? 'Próximo treino' : 'Finalizar treino'}
                <ChevronRight size={18} />
              </GameButton>
            )}

            {phase === 'resting' && (
              <>
                <div className="flex gap-2">
                  <GameButton
                    size="lg"
                    className="flex-[8] flex items-center justify-center gap-2"
                    variant={paused ? 'primary' : 'secondary'}
                    onClick={togglePause}
                  >
                    {paused ? (
                      <>
                        <Play size={20} fill="currentColor" /> Continuar descanso
                      </>
                    ) : (
                      <>
                        <Pause size={20} /> Pausar descanso
                      </>
                    )}
                  </GameButton>
                  <GameButton
                    size="lg"
                    variant="ghost"
                    className="flex-[2] flex items-center justify-center"
                    onClick={resetTimer}
                    aria-label="Reiniciar cronômetro de descanso"
                    title="Reiniciar cronômetro"
                  >
                    <RotateCcw size={18} />
                  </GameButton>
                </div>
                <GameButton
                  variant="secondary"
                  size="lg"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={skipRest}
                >
                  <SkipForward size={18} /> Pular descanso
                </GameButton>
              </>
            )}
          </div>
        </main>

        <QuitWorkoutModal
          open={showQuitModal}
          onClose={() => setShowQuitModal(false)}
          onQuit={quitWorkout}
        />

        {recoveringWorkout && (
          <WorkoutRecoveryModal
            exerciseName={currentName}
            progress={`Exercício ${exerciseIndex + 1} de ${workout.queue.length} · série ${seriesIndex + 1}`}
            onResume={resumeRecoveredWorkout}
            onQuit={quitWorkout}
          />
        )}

        {paused &&
          canTogglePause &&
          !showExerciseGuide &&
          !recoveringWorkout &&
          !showQuitModal &&
          currentExerciseDefinition && (
            <PlayerPauseOverlay
              exercise={currentExerciseDefinition}
              exerciseIndex={exerciseIndex}
              exerciseCount={workout.queue.length}
              setIndex={seriesIndex}
              setCount={totalSeries}
              sideLabel={currentSideInstruction}
              isResting={phase === 'resting'}
              onResume={togglePause}
              onRestart={resetTimer}
              onExit={() => setShowQuitModal(true)}
            />
          )}

        {currentExerciseDefinition && (
          <ExerciseGuideSheet
            exercise={currentExerciseDefinition}
            open={showExerciseGuide}
            onClose={() => setShowExerciseGuide(false)}
            prescriptionLabel={prescription}
            sideLabel={currentSideInstruction}
          />
        )}
      </div>
    </WorkoutScene>
  );
}
