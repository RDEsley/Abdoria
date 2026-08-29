import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  ListChecks,
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
import { WorkoutTimerRing } from '@/components/player/WorkoutTimerRing';
import { WorkoutVictoryScreen } from '@/components/player/WorkoutVictoryScreen';
import { CampaignStoryScreen } from '@/components/player/CampaignStoryScreen';
import {
  buildCampaignPosts,
  CAMPAIGN_STREAK_MILESTONES,
  CAMPAIGN_STREAK_NARRATIVE_MIN,
  type CampaignCatalogInfo,
  type CampaignPost,
  type CapituloOverride,
} from '@shared/campaign';
import { getTodaySaoPaulo } from '@shared/utils/timezone';
import { GameButton } from '@/components/ui/GameButton';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { useAtividadesFlow } from '@/hooks/useAtividadesFlow';
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
import { showGameToast } from '@/components/ui/GameToast';
import { getRecommendWorkout, updateMe } from '@/lib/api';
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
import {
  formatExerciseName,
  formatExercisePrescription,
  resolveCosmeticos,
  xpLevelFromTotal,
  type LevelUpCelebration as LevelUpData,
} from '@/types';
import type { ActiveWorkout, WorkoutQueueItem, XpBreakdown } from '@/types';

type Phase = 'ready' | 'working' | 'resting' | 'done' | 'atividades-prompt';

const ACTIVE_WORKOUT_KEY = 'abdoria_active_workout';

const ONE_SIDE_EXERCISES = new Set(['side-plank', 'copenhagen-plank', 'single-leg-glute-bridge']);

function sideInstruction(item: WorkoutQueueItem | undefined, seriesIndex: number): string | null {
  if (!item || !ONE_SIDE_EXERCISES.has(item.slug)) return null;
  const side = seriesIndex % 2 === 0 ? 'lado esquerdo' : 'lado direito';
  return seriesIndex === 0 ? `Comece pelo ${side}.` : `Agora, ${side}.`;
}

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
  const { saveWorkout, exercises, ensureExercises } = useApp();
  const { user: authUser } = useAuth();
  const atividadesFlow = useAtividadesFlow();
  const [workout] = useState<ActiveWorkout | null>(readActiveWorkout);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [restTotalSec, setRestTotalSec] = useState(0);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [coinsGained, setCoinsGained] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<XpBreakdown | null>(null);
  const [streakCelebration, setStreakCelebration] = useState<number | null>(null);
  const [levelUpCelebration, setLevelUpCelebration] = useState<LevelUpData | null>(null);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showRodadaModal, setShowRodadaModal] = useState(false);
  const [rodadaBusy, setRodadaBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [storyPost, setStoryPost] = useState<CampaignPost | null>(null);
  const [showStory, setShowStory] = useState(false);
  // Snapshot pré-treino (só roda no mount, via inicializador de useState): se
  // a conta nunca teve streak nenhum, esta sessão (treino ou atividade) é
  // genuinamente a primeira da vida da conta — capturado uma única vez pra
  // não virar "sempre primeiro" caso `authUser` seja atualizado em segundo
  // plano depois do save.
  const [isFirstEver] = useState(() => (authUser?.gamificacao?.streak_maior ?? 0) === 0);
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
  const startTimeRef = useRef(0);
  const endTimeRef = useRef(0);
  const pausedMsRef = useRef(0);
  const pauseStartedRef = useRef<number | null>(null);
  const sessionStartedRef = useRef(false);
  const tickHandledRef = useRef(false);
  const spokenSideRef = useRef('');

  useEffect(() => {
    mutedRef.current = muted;
    prefsRef.current = authUser?.preferencias;
    setSoundSettings(!muted, authUser?.preferencias?.sfx_volume ?? 0.7);
  }, [muted, authUser?.preferencias]);

  useEffect(() => {
    countdownEnabledRef.current = countdownEnabled;
  }, [countdownEnabled]);

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
  const currentSideInstruction = sideInstruction(current, seriesIndex);

  useEffect(() => {
    if (!current || !currentSideInstruction || muted || phase !== 'ready') return;
    const key = `${current.slug}:${seriesIndex}`;
    if (spokenSideRef.current === key || !('speechSynthesis' in window)) return;
    spokenSideRef.current = key;
    const utterance = new SpeechSynthesisUtterance(currentSideInstruction);
    utterance.lang = 'pt-BR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [current, currentSideInstruction, muted, phase, seriesIndex]);

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

    endTimeRef.current = persistWorkoutEndedAt();
    playWorkoutComplete();
    // Atividades anexadas (se houver) só entram em cena depois da Missão
    // Completa e do capítulo da campanha — ver `proceedAfterStory`.
    setPhase('done');
  }, [workout, current, seriesIndex, totalSeries, exerciseIndex, getRestSeconds, startRest]);

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
    setMediaError(false);
  };

  const goBackOneStep = () => {
    if (!workout || (exerciseIndex === 0 && seriesIndex === 0)) return;
    resetForNavigation();

    if (seriesIndex > 0) {
      setSeriesIndex((index) => Math.max(index - 1, 0));
      return;
    }

    const previousIndex = Math.max(exerciseIndex - 1, 0);
    const previousSeries = Math.max((workout.queue[previousIndex]?.series ?? 1) - 1, 0);
    setExerciseIndex(previousIndex);
    setSeriesIndex(previousSeries);
  };

  const goToNextExercise = () => {
    if (!workout || !current) return;
    resetForNavigation();
    if (exerciseIndex + 1 < workout.queue.length) {
      setExerciseIndex((index) => index + 1);
      setSeriesIndex(0);
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

  const quitWorkout = () => {
    sessionStorage.removeItem(ACTIVE_WORKOUT_KEY);
    clearWorkoutDurationSession();
    navigate('/construtor', { replace: true });
  };

  /** Só admins (testes): pula direto pra tela de missão completa. */
  const skipAllForTests = () => {
    endTimeRef.current = Date.now();
    persistWorkoutEndedAt(endTimeRef.current);
    playWorkoutComplete();
    setPhase('done');
  };

  /** Capítulo de campanha gerado pela missão recém-concluída (mesma lógica do feed).
      `streakAtualHoje` só vem preenchido quando o servidor confirma que ESTA
      sessão de fato estendeu o streak (ver `streak_celebration` na resposta
      de salvar) — sem isso, nunca forçamos um marco de capítulo. Sessão
      chaveada por dia (não por timestamp) pra repetir o MESMO capítulo se o
      usuário passar pela tela de novo no mesmo dia, em vez de sortear outro. */
  const buildStoryPost = (
    xpGanho: number,
    duracao: number,
    streakAtualHoje: number | null,
  ): CampaignPost | null => {
    if (!workout || !authUser) return null;
    const sessionId = `sessao-${getTodaySaoPaulo()}`;
    const capituloOverride: CapituloOverride | null = isFirstEver
      ? { sessionId, marco: { tipo: 'primeiro' } }
      : streakAtualHoje != null &&
          streakAtualHoje >= CAMPAIGN_STREAK_NARRATIVE_MIN &&
          CAMPAIGN_STREAK_MILESTONES.includes(streakAtualHoje)
        ? { sessionId, marco: { tipo: 'streak', dias: streakAtualHoje } }
        : null;
    const catalogBySlug = new Map<string, CampaignCatalogInfo>(
      exercises.map((ex) => [
        ex.slug,
        {
          nivel: ex.nivel,
          prioridade: ex.prioridade,
          musculo_principal: ex.musculo_principal,
          grupos: ex.grupos,
          nome_pt: ex.nome_pt,
        },
      ]),
    );
    const posts = buildCampaignPosts(
      [
        {
          id: sessionId,
          treino_nome: workout.treino_nome,
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
          duracao_total_segundos: duracao,
          xp_ganho: xpGanho,
          concluido_em: new Date().toISOString(),
        },
      ],
      catalogBySlug,
      {
        heroi: authUser.nome?.split(' ')[0] ?? 'O herói',
        level: xpLevelFromTotal(authUser.gamificacao?.nivel_xp ?? 0),
      },
      capituloOverride,
    );
    return posts[0] ?? null;
  };

  useEffect(() => {
    // Catálogo pronto pra montar o capítulo de campanha no fim da missão.
    void ensureExercises();
  }, [ensureExercises]);

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
      const result = await saveWorkout({
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
      sessionStorage.removeItem(ACTIVE_WORKOUT_KEY);
      clearWorkoutDurationSession();
      setSaved(true);
      setStoryPost(
        buildStoryPost(
          result.xp_ganho ?? 0,
          Math.max(duration, 1),
          result.streak_celebration?.streak_atual ?? null,
        ),
      );
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
    // usuário tocar em nada — pra "Missão Completa" não parecer uma
    // segunda tela que exige ação manual.
    if (phase === 'done' && !finishTriggeredRef.current) {
      finishTriggeredRef.current = true;
      void handleFinish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na transição de fase, handleFinish já se protege com `saving`/`saved`
  }, [phase]);

  /**
   * Depois da Missão Completa (e do capítulo da campanha, se houver): só
   * agora — nunca antes — checa se vale oferecer as atividades anexadas.
   * Feito assim de propósito, pra não interromper o fluxo normal de
   * "treino → missão → capítulo" com nada extra no meio.
   */
  const proceedAfterStory = () => {
    const podeOferecerAtividades =
      atividadesFlow.agenda.junto_com_treino && atividadesFlow.filaPendente.length > 0;
    if (podeOferecerAtividades) {
      setPhase('atividades-prompt');
    } else {
      navigate('/');
    }
  };

  /** Leva pra tela de escolha das atividades — nenhuma abre sozinha, o
      usuário escolhe da lista qual quer fazer primeiro. */
  const iniciarAtividadesDaMissao = () => {
    navigate('/atividades-player');
  };

  const handleRodadaManter = () => {
    setShowRodadaModal(false);
  };

  const handleVictoryContinue = () => {
    if (storyPost) setShowStory(true);
    else proceedAfterStory();
  };

  const handleRodadaTrocar = async () => {
    setRodadaBusy(true);
    try {
      const treino = await getRecommendWorkout({
        shuffle: true,
        excludePresetId: workout?.preset_id ?? null,
      });
      setShowRodadaModal(false);
      navigate(`/construtor?preset=${treino.preset_id}`);
    } catch {
      setShowRodadaModal(false);
      navigate('/construtor');
    } finally {
      setRodadaBusy(false);
    }
  };

  if (!workout || !current) return null;

  if (phase === 'done') {
    if (showStory && storyPost) {
      return <CampaignStoryScreen post={storyPost} onContinue={proceedAfterStory} />;
    }
    return (
      <WorkoutVictoryScreen
        workoutName={workout.treino_nome}
        xpGained={xpGained}
        abdoriaGained={coinsGained}
        xpBreakdown={xpBreakdown}
        streakCelebration={streakCelebration}
        levelUpCelebration={levelUpCelebration}
        equippedEffectId={equippedEffectId}
        saving={saving}
        saved={saved}
        onFinish={() => void handleFinish()}
        onContinue={handleVictoryContinue}
        showRodadaModal={showRodadaModal}
        rodadaBusy={rodadaBusy}
        onRodadaKeep={handleRodadaManter}
        onRodadaSwap={() => void handleRodadaTrocar()}
      />
    );
  }

  if (phase === 'atividades-prompt') {
    const n = atividadesFlow.filaPendente.length;
    return (
      <div className="game-app fixed inset-0 z-50 flex flex-col items-center justify-center p-6">
        <AnimatedBackground variant="player" />
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="game-victory relative z-10 text-center"
        >
          <span className="game-atividades-prompt__icon" aria-hidden>
            <ListChecks size={30} />
          </span>
          <h2 className="game-victory__title !text-base">QUER FAZER AS ATIVIDADES AGORA?</h2>
          <p className="mt-2 text-sm font-bold text-stone-600">
            Você anexou {n} atividade{n === 1 ? '' : 's'} a esta missão — dá pra fazer agora, na
            sequência, ou deixar pra mais tarde.
          </p>
          <GameButton
            size="lg"
            className="mt-5 flex w-full items-center justify-center gap-2"
            onClick={iniciarAtividadesDaMissao}
          >
            Sim, fazer agora <ChevronRight size={18} />
          </GameButton>
          <button type="button" className="game-auth-guest-link" onClick={() => navigate('/')}>
            Fazer mais tarde
          </button>
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

  const canTogglePause = phase === 'resting' || (phase === 'working' && current.modo === 'tempo');
  const ringPodeIniciar = phase === 'ready' && countdownValue === null;
  const ringOnClick = ringPodeIniciar ? startSeries : canTogglePause ? togglePause : undefined;
  const ringLabel = ringPodeIniciar
    ? `Iniciar série ${seriesIndex + 1}`
    : canTogglePause
      ? paused
        ? 'Continuar cronômetro'
        : 'Pausar cronômetro'
      : undefined;

  const phaseBadge =
    phase === 'resting' ? (
      <span className="game-player-phase game-player-phase--rest">
        <Timer size={14} /> Cronômetro de descanso
      </span>
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

  const restStatus =
    phase === 'resting'
      ? {
          main: paused ? 'Descanso pausado' : `Descanso · ${formatTime(restTotalSec)}`,
          timer: formatTime(secondsLeft),
          next: nextSeriesLabel,
        }
      : null;

  return (
    <div className="game-player game-app fixed inset-0 z-50 flex flex-col overflow-hidden">
      <AnimatedBackground variant="player" />
      <header className="game-player-hud relative z-10 shrink-0 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowQuitModal(true)}
          className="cursor-pointer font-bold text-stone-600"
          aria-label="Desistir do treino"
        >
          <X size={24} />
        </button>
        <div className="text-center">
          <p className="game-page-header__eyebrow !mb-0">{workout.treino_nome}</p>
          <p className="text-xs font-extrabold text-stone-800">
            Exercício {exerciseIndex + 1}/{workout.queue.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {authUser?.role === 'admin' && (
            <button
              type="button"
              onClick={skipAllForTests}
              className="cursor-pointer rounded-full border-2 border-purple-300 bg-purple-50 px-2 py-0.5 text-[0.6rem] font-black uppercase text-purple-700"
              title="Pular direto pro fim do treino (só admins, para testes)"
            >
              Skip ADM
            </button>
          )}
          <button
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
          >
            <Hourglass size={18} />
          </button>
          <button
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
          >
            {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>
        </div>
      </header>

      <div
        className="relative z-10 flex shrink-0 gap-1 px-4 pb-1 sm:px-6"
        role="progressbar"
        aria-valuenow={exerciseIndex + 1}
        aria-valuemin={1}
        aria-valuemax={workout.queue.length}
        aria-label={`Exercício ${exerciseIndex + 1} de ${workout.queue.length}`}
      >
        {workout.queue.map((item, i) => (
          <span
            key={`${item.slug}-${i}`}
            className={`game-progress-dot h-1.5 flex-1 rounded-full border border-stone-900/25 ${
              i < exerciseIndex
                ? 'bg-emerald-500'
                : i === exerciseIndex
                  ? 'bg-amber-400 game-progress-dot--active'
                  : 'bg-stone-200/80'
            }`}
          />
        ))}
      </div>

      <div className="game-player-body relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
        <div className="game-player-content flex flex-col items-center gap-2 px-4 py-2 sm:gap-4 sm:px-6 sm:py-4">
          {phaseBadge}

          <AnimatePresence mode="wait">
            <motion.div
              key={`${current.slug}-${exerciseIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm"
            >
              <div className="game-player-frame relative mx-auto aspect-square w-full max-w-[7.5rem] sm:max-w-[10rem]">
                {!mediaError ? (
                  <img
                    src={exerciseMediaUrl(current.slug)}
                    alt={currentName}
                    className="h-full w-full object-cover"
                    onError={() => setMediaError(true)}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl font-extrabold text-emerald-200">
                    {currentName[0]}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="w-full text-center">
            <h2 className="game-page-header__title !text-base">{currentName}</h2>
            <p className="mt-0.5 text-[0.65rem] font-extrabold uppercase tracking-wide text-emerald-700">
              Meta: {prescription}
            </p>
            {restStatus ? (
              <div className="game-player-rest-status mt-1.5">
                <p className="game-player-rest-status__main">{restStatus.main}</p>
                <p className="game-player-rest-status__timer tabular-nums">{restStatus.timer}</p>
                <p className="game-player-rest-status__next">{restStatus.next}</p>
              </div>
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
                  <p className="mx-auto mt-1.5 max-w-xs text-center text-xs font-bold leading-relaxed text-stone-600">
                    {statusText}
                  </p>
                </>
              )
            )}
          </div>

          <div className="relative">
            <WorkoutTimerRing
              phase={phase}
              modo={current.modo}
              secondsLeft={secondsLeft}
              seriesIndex={seriesIndex}
              totalSeries={totalSeries}
              progressPct={progressPct}
              paused={paused}
              onCenterClick={ringOnClick}
              clickLabel={ringLabel}
            />

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

          {paused && canTogglePause && (
            <p className="game-player-paused">
              <Pause size={14} /> Cronômetro pausado · use o botão abaixo para continuar
            </p>
          )}
        </div>

        <div className="game-player-actions mt-auto flex shrink-0 flex-col gap-2 px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:gap-3 sm:px-6 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          {(exerciseIndex > 0 || seriesIndex > 0) && (
            <GameButton
              size="lg"
              variant="ghost"
              className="w-full flex items-center justify-center gap-2"
              onClick={goBackOneStep}
            >
              <ChevronLeft size={18} />
              {seriesIndex > 0 ? 'Voltar para a série anterior' : 'Voltar para o treino anterior'}
            </GameButton>
          )}

          {phase === 'ready' && (
            <GameButton
              size="lg"
              className="w-full flex items-center justify-center gap-2"
              onClick={startSeries}
            >
              <Play size={20} fill="currentColor" />
              Iniciar série {seriesIndex + 1}
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

          {current.modo === 'tempo' && (
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
      </div>

      <QuitWorkoutModal
        open={showQuitModal}
        onClose={() => setShowQuitModal(false)}
        onQuit={quitWorkout}
      />
    </div>
  );
}
