import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Coins, LogOut, Pause, Play, SkipForward, Timer, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { CompletionCelebration } from '@/components/effects/CompletionCelebration';
import { LevelUpCelebration } from '@/components/effects/LevelUpCelebration';
import { StreakFireCelebration } from '@/components/effects/StreakFireCelebration';
import { GameButton } from '@/components/ui/GameButton';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { exerciseMediaUrl } from '@/lib/media';
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
import { updateMe } from '@/lib/api';
import { formatTime } from '@/lib/utils';
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
import { CURRENCY_NAME, formatExerciseName, formatExercisePrescription, type LevelUpCelebration as LevelUpData } from '@/types';
import type { ActiveWorkout, WorkoutQueueItem, XpBreakdown } from '@/types';

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
  const { user: authUser } = useAuth();
  const [workout] = useState<ActiveWorkout | null>(readActiveWorkout);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [restTotalSec, setRestTotalSec] = useState(0);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [abdoriaGained, setAbdoriaGained] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<XpBreakdown | null>(null);
  const [streakCelebration, setStreakCelebration] = useState<number | null>(null);
  const [levelUpCelebration, setLevelUpCelebration] = useState<LevelUpData | null>(null);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [muted, setMuted] = useState(() => !(authUser?.preferencias?.som_habilitado ?? true));
  const mutedRef = useRef(muted);
  const prefsRef = useRef(authUser?.preferencias);
  const startTimeRef = useRef(0);
  const endTimeRef = useRef(0);
  const pausedMsRef = useRef(0);
  const pauseStartedRef = useRef<number | null>(null);
  const sessionStartedRef = useRef(false);
  const tickHandledRef = useRef(false);

  useEffect(() => {
    mutedRef.current = muted;
    prefsRef.current = authUser?.preferencias;
    setSoundSettings(!muted, authUser?.preferencias?.sfx_volume ?? 0.7);
  }, [muted, authUser?.preferencias]);

  useEffect(() => {
    return () => {
      const prefs = prefsRef.current;
      if (!prefs) return;
      void updateMe({
        preferencias: { ...prefs, som_habilitado: !mutedRef.current },
      });
    };
  }, []);

  useEffect(() => {
    if (!workout) return;

    const storedStart = readWorkoutStartedAt();
    if (storedStart) {
      startTimeRef.current = storedStart;
      sessionStartedRef.current = true;
    }

    pausedMsRef.current = readWorkoutPausedMs();
    const storedEnd = readWorkoutEndedAt();
    if (storedEnd) {
      endTimeRef.current = storedEnd;
    }
  }, [workout]);

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

  const startRest = useCallback(
    (restSec: number) => {
      setRestTotalSec(restSec);
      setSecondsLeft(restSec);
      setPhase('resting');
      setPaused(false);
      playRestStart();
    },
    [],
  );

  const advanceAfterSeries = useCallback(() => {
    if (!workout || !current) return;

    playCompleteSet();

    if (seriesIndex + 1 < totalSeries) {
      setSeriesIndex((s) => s + 1);
      startRest(getRestSeconds());
      return;
    }

    if (exerciseIndex + 1 < workout.queue.length) {
      setExerciseIndex((i) => i + 1);
      setSeriesIndex(0);
      startRest(getRestSeconds());
      setMediaError(false);
      return;
    }

    setPhase('done');
    endTimeRef.current = persistWorkoutEndedAt();
    playWorkoutComplete();
  }, [workout, current, seriesIndex, totalSeries, exerciseIndex, getRestSeconds, startRest]);

  const runsCountdown =
    phase === 'resting' || (phase === 'working' && current?.modo === 'tempo');

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

  const startSeries = () => {
    if (!sessionStartedRef.current) {
      startTimeRef.current = persistWorkoutStartedAt();
      sessionStartedRef.current = true;
    }
    setPaused(false);
    if (current?.modo === 'reps') {
      setPhase('working');
    } else {
      setSecondsLeft(getTargetSeconds());
      setPhase('working');
    }
  };

  const completeSeries = () => {
    if (phase !== 'working') return;
    advanceAfterSeries();
  };

  const skipRest = () => {
    if (phase !== 'resting') return;
    tickHandledRef.current = true;
    setPhase('ready');
    setSecondsLeft(0);
    setRestTotalSec(0);
    setPaused(false);
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

  const quitWorkout = () => {
    sessionStorage.removeItem(ACTIVE_WORKOUT_KEY);
    clearWorkoutDurationSession();
    navigate('/construtor', { replace: true });
  };

  const handleFinish = async () => {
    if (!workout || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const duration = computeWorkoutElapsedSeconds({
        workout,
        startedAt: startTimeRef.current || readWorkoutStartedAt(),
        endedAt: endTimeRef.current || readWorkoutEndedAt(),
        pausedMs: pausedMsRef.current,
        pauseStartedAt: pauseStartedRef.current,
      });
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
      setAbdoriaGained(result.abdoria_ganha ?? 0);
      setXpBreakdown(result.xp_breakdown ?? null);
      if (result.streak_celebration) {
        setStreakCelebration(result.streak_celebration.streak_atual);
      }
      if (result.level_up) {
        setLevelUpCelebration(result.level_up);
      }
      sessionStorage.removeItem(ACTIVE_WORKOUT_KEY);
      clearWorkoutDurationSession();
      setTimeout(() => navigate('/'), 2500);
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Não foi possível salvar seu treino. Tente novamente.'));
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
          ) : levelUpCelebration ? (
            <LevelUpCelebration
              level={levelUpCelebration.level_novo}
              previousLevel={levelUpCelebration.level_anterior}
            />
          ) : (
            <div className="game-level-badge mx-auto mb-4">✓</div>
          )}
          <h2 className="game-victory__title">MISSÃO COMPLETA!</h2>
          {levelUpCelebration && streakCelebration !== null && (
            <LevelUpCelebration
              compact
              level={levelUpCelebration.level_novo}
              previousLevel={levelUpCelebration.level_anterior}
            />
          )}
          <p className="mt-2 text-sm font-bold text-stone-600">{workout.treino_nome}</p>
          {xpGained > 0 && (
            <div className="game-victory__rewards">
              <p className="game-victory__xp">
                <Zap size={14} aria-hidden /> +{xpGained} XP
              </p>
              {abdoriaGained > 0 && (
                <p className="game-victory__abdoria">
                  <Coins size={14} aria-hidden /> +{abdoriaGained} {CURRENCY_NAME}
                </p>
              )}
              {xpBreakdown && (
                <ul className="game-victory__breakdown">
                  {xpBreakdown.exercicios > 0 && (
                    <li>Exercícios (diário) +{xpBreakdown.aplicado_diario}</li>
                  )}
                  {xpBreakdown.exercicios === 0 && xpBreakdown.total_diario === 0 && (
                    <li className="game-victory__breakdown-cap">Mín. 3 exercícios para XP diário</li>
                  )}
                  {xpBreakdown.streak > 0 && <li>Streak (extra) +{xpBreakdown.streak}</li>}
                  {xpBreakdown.conquistas > 0 && <li>Conquistas (extra) +{xpBreakdown.conquistas}</li>}
                  {xpBreakdown.total_diario > xpBreakdown.aplicado_diario && (
                    <li className="game-victory__breakdown-cap">
                      Teto diário · +{xpBreakdown.aplicado_diario}/{xpBreakdown.total_diario} de exercícios
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
          {saveError && <p className="mt-4 game-login__error">{saveError}</p>}
          <GameButton onClick={handleFinish} size="lg" className="mt-6 w-full" disabled={saving}>
            {saving ? 'Salvando...' : xpGained > 0 ? 'Voltar ao início' : 'Salvar e voltar'}
          </GameButton>
        </motion.div>
      </div>
    );
  }

  const targetReps = getTargetReps();
  const targetSeconds = getTargetSeconds();
  const prescription = formatExercisePrescription(current);
  const currentName = formatExerciseName(current);
  const nextExercise = workout.queue[exerciseIndex + 1];
  const nextSeriesLabel =
    seriesIndex + 1 < totalSeries
      ? `próxima: série ${seriesIndex + 2}`
      : nextExercise
        ? `próximo: ${formatExerciseName(nextExercise)}`
        : 'última série do treino';

  const progressPct =
    phase === 'working' && current.modo === 'tempo' && targetSeconds > 0
      ? ((targetSeconds - secondsLeft) / targetSeconds) * 100
      : phase === 'working' && current.modo === 'reps'
        ? ((seriesIndex + 1) / totalSeries) * 100
        : phase === 'resting' && restTotalSec > 0
          ? ((restTotalSec - secondsLeft) / restTotalSec) * 100
          : 0;

  const ringCenter =
    phase === 'resting' ? (
      <>
        <span className="game-timer-ring__label tabular-nums">{formatTime(secondsLeft)}</span>
        <span className="game-timer-ring__sublabel">descanso</span>
      </>
    ) : phase === 'working' && current.modo === 'tempo' ? (
      <>
        <span className="game-timer-ring__label tabular-nums">{formatTime(secondsLeft)}</span>
        <span className="game-timer-ring__sublabel">exercício</span>
      </>
    ) : phase === 'working' ? (
      <>
        <span className="game-timer-ring__label tabular-nums">
          {seriesIndex + 1}/{totalSeries}
        </span>
        <span className="game-timer-ring__sublabel">série</span>
      </>
    ) : (
      <>
        <Play size={32} className="text-emerald-500" />
        <span className="game-timer-ring__sublabel mt-1">pronta</span>
      </>
    );

  const phaseBadge =
    phase === 'resting' ? (
      <span className="game-player-phase game-player-phase--rest">
        <Timer size={14} /> Cronômetro de descanso
      </span>
    ) : phase === 'working' ? (
      <span className="game-player-phase game-player-phase--work">Série {seriesIndex + 1} de {totalSeries}</span>
    ) : (
      <span className="game-player-phase game-player-phase--ready">Pronto para a série {seriesIndex + 1}</span>
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

  const restStatus =
    phase === 'resting'
      ? {
          main: paused ? 'Descanso pausado' : `Descanso · ${formatTime(restTotalSec)}`,
          timer: formatTime(secondsLeft),
          next: nextSeriesLabel,
        }
      : null;

  const canTogglePause = phase === 'resting' || (phase === 'working' && current.modo === 'tempo');
  const ringStroke = phase === 'resting' ? '#0284c7' : '#059669';

  return (
    <div className="game-player game-app fixed inset-0 z-50 flex flex-col overflow-hidden">
      <AnimatedBackground variant="player" />
      <header className="game-player-hud relative z-10 shrink-0 flex items-center justify-between">
        <button type="button" onClick={() => setShowQuitModal(true)} className="cursor-pointer font-bold text-stone-600" aria-label="Desistir do treino">
          <X size={24} />
        </button>
        <div className="text-center">
          <p className="game-page-header__eyebrow !mb-0">{workout.treino_nome}</p>
          <p className="text-xs font-extrabold text-stone-800">
            Exercício {exerciseIndex + 1}/{workout.queue.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !muted;
            setMuted(next);
            setSoundSettings(!next, authUser?.preferencias?.sfx_volume ?? 0.7);
          }}
          className="cursor-pointer text-stone-600"
          aria-label={muted ? 'Ativar sons' : 'Silenciar sons'}
        >
          {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      </header>

      <div className="game-player-body relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
        <div className="game-player-content flex flex-col items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6 sm:py-5">
        {phaseBadge}

        <AnimatePresence mode="wait">
          <motion.div key={`${current.slug}-${exerciseIndex}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
            <div className="game-player-frame relative mx-auto aspect-square w-full max-w-[10.5rem] sm:max-w-xs">
              {!mediaError ? (
                <img src={exerciseMediaUrl(current.slug)} alt={currentName} className="h-full w-full object-cover" onError={() => setMediaError(true)} />
              ) : (
                <div className="flex h-full items-center justify-center text-5xl font-extrabold text-emerald-200">{currentName[0]}</div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="text-center">
          <h2 className="game-page-header__title !text-base">{currentName}</h2>
          <p className="mt-1 text-[0.65rem] font-extrabold uppercase tracking-wide text-emerald-700">Meta: {prescription}</p>
          {restStatus ? (
            <div className="game-player-rest-status mt-2">
              <p className="game-player-rest-status__main">{restStatus.main}</p>
              <p className="game-player-rest-status__timer tabular-nums">{restStatus.timer}</p>
              <p className="game-player-rest-status__next">{restStatus.next}</p>
            </div>
          ) : (
            statusText && (
              <p className="mt-2 max-w-xs text-xs font-bold leading-relaxed text-stone-600">{statusText}</p>
            )
          )}
        </div>

        <div className={`game-timer-ring ${phase === 'resting' ? 'game-timer-ring--rest' : ''}`}>
          <svg className="game-timer-ring__svg -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#e7e5e4" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={ringStroke}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${progressPct * 2.83} 283`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">{ringCenter}</div>
        </div>

        {paused && canTogglePause && (
          <p className="game-player-paused">
            <Pause size={14} /> Cronômetro pausado · toque em continuar
          </p>
        )}
        </div>

      <div className="game-player-actions mt-auto flex shrink-0 flex-col gap-2 px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:gap-3 sm:px-6 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        {phase === 'ready' && (
          <GameButton size="lg" className="w-full flex items-center justify-center gap-2" onClick={startSeries}>
            <Play size={20} fill="currentColor" />
            Iniciar série {seriesIndex + 1}
          </GameButton>
        )}

        {phase === 'working' && (
          <GameButton size="lg" className="w-full flex items-center justify-center gap-2" onClick={completeSeries}>
            <Check size={22} />
            Série concluída
          </GameButton>
        )}

        {phase === 'resting' && (
          <>
            <GameButton
              size="lg"
              className="w-full flex items-center justify-center gap-2"
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
            <GameButton variant="secondary" size="lg" className="w-full flex items-center justify-center gap-2" onClick={skipRest}>
              <SkipForward size={18} /> Pular descanso
            </GameButton>
          </>
        )}

        <GameButton variant="secondary" size="lg" className="w-full flex items-center justify-center gap-2 text-red-700" onClick={() => setShowQuitModal(true)}>
          <LogOut size={18} /> Desistir do treino
        </GameButton>
      </div>
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
                Se você sair agora, este treino não será contado — nada do que fez até aqui será salvo. Para
                treinar de novo, volte na aba <strong>Missão</strong> (ícone de haltere) e inicie outro treino.
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
