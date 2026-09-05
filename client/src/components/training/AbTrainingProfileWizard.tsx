import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Gauge,
  Info,
  LoaderCircle,
  Lock,
  Music2,
  SlidersHorizontal,
  Sparkles,
  TimerReset,
  Volume2,
  X,
} from 'lucide-react';
import {
  AB_CUSTOM_EXERCISE_MAX,
  AB_CUSTOM_EXERCISE_MIN,
  AB_CUSTOM_REPS_MAX,
  AB_CUSTOM_REPS_MIN,
  AB_CUSTOM_REST_MAX,
  AB_CUSTOM_REST_MIN,
  AB_CUSTOM_SERIES_MAX,
  AB_CUSTOM_SERIES_MIN,
  AB_INTENSITY_LABELS,
  clampCustomExerciseCount,
  clampCustomReps,
  clampCustomRest,
  clampCustomSeries,
  createDefaultAbTrainingProfile,
  effortFromTargetReps,
  estimateSessionMinutesForProfile,
  exerciseCountForProfile,
  normalizeAbTrainingCustom,
} from '@shared/ab-training-profile';
import type {
  AbTrainingIntensity,
  AbTrainingProfileV2,
  IUserDocument,
  ShopCatalogItem,
} from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { equipShopItem, getShop, updateAbTrainingProfileV2 } from '@/lib/api';
import {
  actionHaptic,
  errorHaptic,
  selectionHaptic,
  successHaptic,
} from '@/lib/platform/native-runtime';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/lib/game-toast';
import { LottieView } from '@/components/ui/LottieView';
import { useLottieAsset } from '@/hooks/useLottieAsset';
import { BrandMark } from '@/components/brand/BrandMark';
import { getSfxPack, previewSfxPack, restoreSfxPack, setSfxPack } from '@/lib/sounds';

type FieldTipKey = 'exercises' | 'series' | 'reps' | 'rest';
type RangeBand = 'neutral' | 'green' | 'yellow' | 'orange' | 'max';

const FIELD_TIPS: Record<FieldTipKey, { title: string; body: string }> = {
  exercises: {
    title: 'Exercícios',
    body: 'Quantos exercícios entram em cada treino de core.',
  },
  series: {
    title: 'Séries',
    body: 'Quantas vezes você repete cada exercício na sessão.',
  },
  reps: {
    title: 'Repetições',
    body: 'Meta de repetições por série. Em exercícios de tempo, o Evolyn adapta o alvo.',
  },
  rest: {
    title: 'Descanso',
    body: 'Pausa entre uma série e a próxima.',
  },
};

function rangePercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.round(((value - min) / (max - min)) * 100);
}

function rangeBand(percent: number): RangeBand {
  if (percent >= 100) return 'max';
  if (percent >= 80) return 'orange';
  if (percent >= 60) return 'yellow';
  if (percent >= 35) return 'green';
  return 'neutral';
}

interface Props {
  open: boolean;
  onClose?: () => void;
  firstVisit?: boolean;
  /** Abre direto na tela custom (valores salvos ou defaults). */
  entryScreen?: 'default' | 'custom';
  onReady?: () => void;
}

type NumberedStep = 0 | 1 | 2 | 3 | 4;

interface WizardDraft {
  mode: 'preset' | 'custom' | null;
  intensity: AbTrainingIntensity | null;
  customCount: number;
  customSeries: number;
  customReps: number;
  customRest: number;
  training_days: number[];
  rest_seconds: number | null;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const INTENSITY_ICONS = { leve: Activity, moderado: Gauge, evolyn: Flame } as const;
const TITLES = [
  'Escolha sua intensidade',
  'Monte sua semana',
  'Escolha o som do sistema',
  'Escolha seu descanso',
  'Seu plano está pronto',
];
const TOTAL_STEPS = 5;
const REST_OPTIONS = [20, 30, 45, 60] as const;
const STEP_LEAVES = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: 3 + ((index * 29) % 94),
  delay: (index % 6) * 0.11,
  duration: 2.45 + (index % 5) * 0.2,
  drift: (index % 2 === 0 ? 1 : -1) * (22 + (index % 4) * 9),
  scale: 0.72 + (index % 4) * 0.12,
}));

function emptyDraft(): WizardDraft {
  return {
    mode: null,
    intensity: null,
    customCount: 6,
    customSeries: 3,
    customReps: 12,
    customRest: 30,
    training_days: [],
    rest_seconds: null,
  };
}

function draftFromProfile(user: IUserDocument | null): WizardDraft {
  const profile = user?.ab_training_profile_v2;
  if (!profile) return emptyDraft();
  const custom = profile.custom ? normalizeAbTrainingCustom(profile.custom) : null;
  return {
    mode: profile.mode === 'custom' ? 'custom' : 'preset',
    intensity: profile.intensity,
    customCount: custom?.exercise_count ?? exerciseCountForProfile(profile),
    customSeries: custom?.series ?? 3,
    customReps: custom?.target_reps ?? 12,
    customRest: custom?.rest_seconds ?? profile.rest_seconds ?? 30,
    training_days: profile.training_days,
    rest_seconds: profile.rest_seconds ?? user?.preferencias?.descanso_padrao_seg ?? 30,
  };
}

function validationMessage(step: NumberedStep, draft: WizardDraft, soundId: string | null): string | null {
  if (step === 0 && !draft.mode) return 'Escolha uma intensidade para continuar.';
  if (step === 0 && draft.mode === 'preset' && !draft.intensity) {
    return 'Escolha uma intensidade para continuar.';
  }
  if (step === 1 && draft.training_days.length < 2) return 'Escolha pelo menos dois dias.';
  if (step === 2 && !soundId) return 'Escolha um som para continuar.';
  if (step === 3 && draft.rest_seconds == null) return 'Escolha o descanso entre séries.';
  return null;
}

function toProfile(draft: WizardDraft, existing: AbTrainingProfileV2 | null): AbTrainingProfileV2 {
  const base = existing ?? createDefaultAbTrainingProfile();
  const intensity = draft.mode === 'custom' ? 'moderado' : (draft.intensity ?? 'moderado');
  const customRest = clampCustomRest(draft.customRest);
  return {
    ...base,
    intensity,
    training_days: draft.training_days,
    volume: base.volume ?? 'equilibrado',
    rest_seconds: draft.mode === 'custom' ? customRest : (draft.rest_seconds ?? 30),
    mode: draft.mode === 'custom' ? 'custom' : 'preset',
    custom:
      draft.mode === 'custom'
        ? {
            exercise_count: clampCustomExerciseCount(draft.customCount),
            series: clampCustomSeries(draft.customSeries),
            target_reps: clampCustomReps(draft.customReps),
            rest_seconds: customRest,
            effort: effortFromTargetReps(draft.customReps),
          }
        : null,
  };
}

export function AbTrainingProfileWizard({
  open,
  onClose,
  firstVisit,
  entryScreen = 'default',
  onReady,
}: Props) {
  const { user, applyUser } = useAuth();
  const reduceMotion = useReducedMotion();
  const originalPack = useRef(getSfxPack());
  const [phase, setPhase] = useState<'intro' | 'steps'>(firstVisit ? 'intro' : 'steps');
  const [step, setStep] = useState<NumberedStep>(0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<WizardDraft>(() =>
    firstVisit ? emptyDraft() : draftFromProfile(user),
  );
  const [soundOptions, setSoundOptions] = useState<ShopCatalogItem[] | null>(null);
  const [selectedSoundId, setSelectedSoundId] = useState<string | null>(
    firstVisit ? null : (user?.cosmeticos?.som_equipado ?? 'som_classico'),
  );
  const [shakeNonce, setShakeNonce] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [leafBurst, setLeafBurst] = useState(0);
  const [fieldTip, setFieldTip] = useState<FieldTipKey | null>(null);
  const lastSliderValue = useRef<Partial<Record<FieldTipKey, number>>>({});
  const maxHapticOnce = useRef<Partial<Record<FieldTipKey, boolean>>>({});
  const finalStep = step === TOTAL_STEPS - 1;
  const showIntro = open && phase === 'intro';
  const confetti = useLottieAsset('/assets/Confetti.json', open && finalStep);
  const lesgo = useLottieAsset('/assets/lesgo.json', open && (finalStep || step === 3));
  const weekPlan = useLottieAsset('/assets/monte-sua-semana.json', open && step === 1);
  const ritmoIntro = useLottieAsset('/assets/monte-seu-ritmo.json', showIntro);
  const customScreen = draft.mode === 'custom' && step === 0;

  useEffect(() => {
    if (!open) return;
    originalPack.current = user?.cosmeticos?.som_equipado ?? 'som_classico';
    const base = firstVisit ? emptyDraft() : draftFromProfile(user);
    if (entryScreen === 'custom') {
      setDraft({
        ...base,
        mode: 'custom',
        intensity: null,
        customCount: base.customCount || 6,
        customSeries: base.customSeries || 3,
        customReps: base.customReps || 12,
        customRest: base.customRest || 30,
      });
      setPhase('steps');
      setStep(0);
    } else {
      setDraft(base);
      setPhase(firstVisit ? 'intro' : 'steps');
      setStep(0);
    }
    setSelectedSoundId(firstVisit ? null : (user?.cosmeticos?.som_equipado ?? 'som_classico'));
    setHint(null);
    setLeafBurst(0);
    let cancelled = false;
    getShop()
      .then((shop) => {
        if (!cancelled) setSoundOptions(shop.sons);
      })
      .catch(() => {
        if (!cancelled) setSoundOptions([]);
      });
    return () => {
      cancelled = true;
      restoreSfxPack(originalPack.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entryScreen]);

  const profilePreview = toProfile(draft, user?.ab_training_profile_v2 ?? null);
  const choose = (update: Partial<WizardDraft>) => {
    void selectionHaptic();
    setHint(null);
    setDraft((current) => ({ ...current, ...update }));
  };

  const beginSliderDrag = (key: FieldTipKey) => {
    maxHapticOnce.current[key] = false;
  };

  const setCustomRange = (
    key: FieldTipKey,
    nextValue: number,
    max: number,
    update: Partial<WizardDraft>,
  ) => {
    const previous = lastSliderValue.current[key];
    if (previous !== nextValue) {
      lastSliderValue.current[key] = nextValue;
      if (nextValue >= max && !maxHapticOnce.current[key]) {
        maxHapticOnce.current[key] = true;
        void actionHaptic();
      } else {
        void selectionHaptic();
      }
    }
    setHint(null);
    setDraft((current) => ({ ...current, ...update }));
  };

  const sortedSounds = useMemo(() => {
    const items = soundOptions ?? [];
    const equipped = user?.cosmeticos?.som_equipado;
    return [...items].sort((a, b) => {
      const rank = (item: ShopCatalogItem) => {
        if (equipped && item.id === equipped) return 0;
        if (item.desbloqueada) return 1;
        return 2;
      };
      return rank(a) - rank(b);
    });
  }, [soundOptions, user?.cosmeticos?.som_equipado]);

  const close = () => {
    restoreSfxPack(originalPack.current);
    onClose?.();
  };

  const goForward = () => {
    const message = validationMessage(step, draft, selectedSoundId);
    if (message) {
      setHint(message);
      setShakeNonce((value) => value + 1);
      void errorHaptic();
      return;
    }
    if (step === 0 && draft.mode === 'custom') {
      choose({ rest_seconds: clampCustomRest(draft.customRest) });
    }
    if (!reduceMotion) setLeafBurst((value) => value + 1);
    setHint(null);
    setStep((current) => (current + 1) as NumberedStep);
  };

  const save = async () => {
    setSaving(true);
    try {
      const profile = toProfile(draft, user?.ab_training_profile_v2 ?? null);
      let updated = await updateAbTrainingProfileV2(profile);
      if (selectedSoundId && selectedSoundId !== originalPack.current) {
        const soundResult = await equipShopItem('som', selectedSoundId);
        updated = soundResult.user;
      }
      if (selectedSoundId) setSfxPack(selectedSoundId);
      originalPack.current = selectedSoundId ?? originalPack.current;
      applyUser(updated);
      await successHaptic();
      showGameToast('Plano de core atualizado.', { variant: 'success' });
      onReady?.();
      onClose?.();
    } catch {
      showGameToast('Não foi possível salvar seu plano.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const selectedSound = sortedSounds.find((item) => item.id === selectedSoundId) ?? null;
  const celebration =
    open && finalStep && !reduceMotion && confetti != null
      ? createPortal(
          <div className="ab-plan-celebration-layer" aria-hidden>
            <LottieView data={confetti} loop={false} cover speed={0.72} />
          </div>,
          document.body,
        )
      : null;
  const fallingLeaves =
    open && phase === 'steps' && leafBurst > 0 && !finalStep && !reduceMotion
      ? createPortal(
          <div key={`ab-plan-leaves-${leafBurst}`} className="ab-plan-leaves-layer" aria-hidden>
            {STEP_LEAVES.map((leaf) => (
              <span
                key={leaf.id}
                className="ab-plan-falling-leaf"
                style={
                  {
                    '--leaf-left': `${leaf.left}%`,
                    '--leaf-delay': `${leaf.delay}s`,
                    '--leaf-duration': `${leaf.duration}s`,
                    '--leaf-drift': `${leaf.drift}px`,
                    '--leaf-end-drift': `${leaf.drift * -0.45}px`,
                    '--leaf-scale': leaf.scale,
                  } as CSSProperties
                }
              />
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <Modal
        open={open}
        onClose={close}
        labelledBy="ab-plan-title"
        overlayClassName="ab-plan-wizard-overlay"
        panelClassName="ab-plan-wizard"
        lockScroll={false}
        trapFocus={false}
        autoFocus={false}
      >
        {phase === 'intro' ? (
          <div className="ab-plan-intro">
            <button type="button" className="game-icon-btn ab-plan-intro__close" onClick={close} aria-label="Fechar">
              <X size={18} aria-hidden />
            </button>
            {ritmoIntro ? (
              <div className="ab-plan-intro__lottie" aria-hidden>
                <LottieView data={ritmoIntro} loop={!reduceMotion} contain />
              </div>
            ) : (
              <BrandMark size={120} alt="" />
            )}
            <h2 id="ab-plan-title">Monte seu ritmo</h2>
            <p className="ab-plan-intro__tag">Um plano que cresce com você.</p>
            <p>
              Você escolhe intensidade, dias, sons e descanso. Depois o Evolyn usa isso para montar
              seus treinos — sem enrolação.
            </p>
            <GameButton
              className="ab-plan-intro__cta"
              onClick={() => {
                void selectionHaptic();
                setPhase('steps');
                setStep(0);
              }}
            >
              Vamos lá!
            </GameButton>
          </div>
        ) : (
          <>
            <header className="ab-plan-wizard__header">
              <div>
                <small>
                  Plano de core · {step + 1} de {TOTAL_STEPS}
                </small>
                <h2 id="ab-plan-title">{customScreen ? 'Personalizada' : TITLES[step]}</h2>
              </div>
              <button type="button" className="game-icon-btn" onClick={close} aria-label="Fechar">
                <X size={18} aria-hidden />
              </button>
            </header>
            <div
              className="ab-plan-wizard__progress"
              role="progressbar"
              aria-label="Progresso da configuração"
              aria-valuemin={1}
              aria-valuemax={TOTAL_STEPS}
              aria-valuenow={step + 1}
            >
              <span style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
            </div>

            <div className={`ab-plan-wizard__content${shakeNonce ? ' is-shake' : ''}`} key={shakeNonce || 'steady'}>
              {step === 0 && !customScreen && (
                <div className="ab-plan-options" role="radiogroup" aria-label="Intensidade">
                  {(['leve', 'moderado', 'evolyn'] as AbTrainingIntensity[]).map((intensity) => {
                    const Icon = INTENSITY_ICONS[intensity];
                    const selected = draft.mode === 'preset' && draft.intensity === intensity;
                    return (
                      <motion.button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        key={intensity}
                        className={`ab-plan-option ab-plan-option--${intensity} ${selected ? 'is-selected' : ''}`}
                        whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                        onClick={() => choose({ mode: 'preset', intensity })}
                      >
                        <span>
                          <Icon size={22} aria-hidden />
                        </span>
                        <strong>{AB_INTENSITY_LABELS[intensity]}</strong>
                        <small>
                          {intensity === 'leve'
                            ? '4–5 exercícios, volume menor e pausas maiores.'
                            : intensity === 'moderado'
                              ? '6–7 exercícios com ritmo equilibrado.'
                              : '8–9 exercícios em um treino mais intenso.'}
                        </small>
                        {selected && <Check className="ab-plan-option__check" size={17} aria-hidden />}
                      </motion.button>
                    );
                  })}
                  <motion.button
                    type="button"
                    role="radio"
                    aria-checked={false}
                    className="ab-plan-option ab-plan-option--custom"
                    whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                    onClick={() => choose({ mode: 'custom', intensity: null })}
                  >
                    <span>
                      <SlidersHorizontal size={22} aria-hidden />
                    </span>
                    <strong>Personalizada</strong>
                    <small>Defina exercícios, séries, alvo e descanso.</small>
                  </motion.button>
                </div>
              )}

              {customScreen && (
                <div className="ab-plan-custom-screen">
                  <button
                    type="button"
                    className="ab-plan-custom-screen__back"
                    onClick={() => choose({ mode: null, intensity: null })}
                  >
                    <ChevronLeft size={16} aria-hidden /> Voltar
                  </button>
                  {(
                    [
                      {
                        key: 'exercises' as const,
                        label: 'Exercícios por treino',
                        value: draft.customCount,
                        min: AB_CUSTOM_EXERCISE_MIN,
                        max: AB_CUSTOM_EXERCISE_MAX,
                        display: String(draft.customCount),
                      },
                      {
                        key: 'series' as const,
                        label: 'Séries por exercício',
                        value: draft.customSeries,
                        min: AB_CUSTOM_SERIES_MIN,
                        max: AB_CUSTOM_SERIES_MAX,
                        display: String(draft.customSeries),
                      },
                      {
                        key: 'reps' as const,
                        label: 'Repetições por série',
                        value: draft.customReps,
                        min: AB_CUSTOM_REPS_MIN,
                        max: AB_CUSTOM_REPS_MAX,
                        display: String(draft.customReps),
                      },
                      {
                        key: 'rest' as const,
                        label: 'Descanso entre séries',
                        value: draft.customRest,
                        min: AB_CUSTOM_REST_MIN,
                        max: AB_CUSTOM_REST_MAX,
                        step: 5,
                        display: `${draft.customRest}s`,
                      },
                    ] as const
                  ).map((control) => {
                    const percent = rangePercent(control.value, control.min, control.max);
                    const band = rangeBand(percent);
                    const atMax = band === 'max';
                    return (
                      <div key={control.key} className="ab-plan-custom-control">
                        <div className="ab-plan-custom-control__label">
                          <span>{control.label}</span>
                          <button
                            type="button"
                            className="ab-plan-custom-control__info"
                            aria-label={`Sobre ${control.label}`}
                            onClick={() => setFieldTip(control.key)}
                          >
                            <Info size={14} aria-hidden />
                          </button>
                        </div>
                        <strong className={`ab-plan-custom-control__value is-${band}`}>
                          {atMax ? (
                            <>
                              <Flame size={14} aria-hidden /> MAX
                            </>
                          ) : (
                            control.display
                          )}
                        </strong>
                        <div
                          className={`ab-plan-custom-slider is-${band}${reduceMotion ? ' is-static' : ''}`}
                          style={{ '--range-pct': `${percent}%` } as CSSProperties}
                        >
                          <input
                            type="range"
                            min={control.min}
                            max={control.max}
                            step={'step' in control ? control.step : 1}
                            value={control.value}
                            aria-label={control.label}
                            onPointerDown={() => beginSliderDrag(control.key)}
                            onTouchStart={() => beginSliderDrag(control.key)}
                            onChange={(event) => {
                              const nextValue = Number(event.target.value);
                              const patch =
                                control.key === 'exercises'
                                  ? { customCount: nextValue }
                                  : control.key === 'series'
                                    ? { customSeries: nextValue }
                                    : control.key === 'reps'
                                      ? { customReps: nextValue }
                                      : { customRest: nextValue };
                              setCustomRange(control.key, nextValue, control.max, patch);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {step === 1 && (
                <div className="ab-plan-days-step">
                  {weekPlan ? (
                    <div className="ab-plan-days-step__lottie" aria-hidden>
                      <LottieView data={weekPlan} loop={!reduceMotion} contain />
                    </div>
                  ) : null}
                  <p className="ab-plan-helper">
                    Escolha pelo menos dois dias na semana para treinar.
                  </p>
                  <div className="ab-plan-days" aria-label="Dias de treino">
                    {DAYS.map((label, day) => (
                      <motion.button
                        type="button"
                        key={day}
                        aria-pressed={draft.training_days.includes(day)}
                        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                        onClick={() =>
                          choose({
                            training_days: draft.training_days.includes(day)
                              ? draft.training_days.filter((entry) => entry !== day)
                              : [...draft.training_days, day].sort(),
                          })
                        }
                      >
                        <span>{label}</span>
                        {draft.training_days.includes(day) && <Check size={13} aria-hidden />}
                      </motion.button>
                    ))}
                  </div>
                  <p className="ab-plan-days-step__count">
                    {draft.training_days.length} dias selecionados
                  </p>
                </div>
              )}

              {step === 2 && (
                <div className="ab-plan-sound-step" role="radiogroup" aria-label="Som do sistema">
                  <p className="ab-plan-helper">
                    Um toque seleciona e toca a prévia. O pacote fica ativo em todo o app.
                  </p>
                  {soundOptions === null ? (
                    <div className="ab-plan-sound-loading" role="status">
                      <LoaderCircle className="animate-spin" size={20} aria-hidden /> Carregando sons…
                    </div>
                  ) : (
                    <div className="ab-plan-sound-options">
                      {sortedSounds.map((item) => {
                        const selected = selectedSoundId === item.id;
                        return (
                          <motion.button
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-disabled={!item.desbloqueada}
                            key={item.id}
                            className={`${selected ? 'is-selected' : ''}${!item.desbloqueada ? ' is-locked' : ''}`}
                            whileTap={reduceMotion || !item.desbloqueada ? undefined : { scale: 0.985 }}
                            onClick={() => {
                              if (!item.desbloqueada) {
                                showGameToast(item.unlock_label, { variant: 'info' });
                                return;
                              }
                              void selectionHaptic();
                              setSelectedSoundId(item.id);
                              previewSfxPack(item.id);
                            }}
                          >
                            <span className="ab-plan-sound-option__icon">
                              {item.desbloqueada ? <Music2 size={16} aria-hidden /> : <Lock size={14} aria-hidden />}
                            </span>
                            <span className="ab-plan-sound-option__copy">
                              <strong>{item.nome}</strong>
                              <small>{item.desbloqueada ? item.descricao : item.unlock_label}</small>
                            </span>
                            <span className="ab-plan-sound-option__status">
                              {selected ? <Check size={14} aria-hidden /> : <Volume2 size={14} aria-hidden />}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="ab-plan-rest-step" role="radiogroup" aria-label="Descanso entre séries">
                  <p className="ab-plan-helper">
                    {draft.mode === 'custom'
                      ? 'Você já definiu um descanso na personalizada. Pode confirmar ou ajustar aqui.'
                      : 'Esse tempo será respeitado pelo Player e poderá ser ajustado durante o treino.'}
                  </p>
                  <div className="ab-plan-rest-options">
                    {REST_OPTIONS.map((seconds) => {
                      const selected = draft.rest_seconds === seconds;
                      return (
                        <motion.button
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          key={seconds}
                          className={selected ? 'is-selected' : ''}
                          whileTap={reduceMotion ? undefined : { scale: 0.94, rotate: -1 }}
                          onClick={() => choose({ rest_seconds: seconds, customRest: seconds })}
                        >
                          <TimerReset size={20} aria-hidden />
                          <strong>{seconds}s</strong>
                          <small>
                            {seconds <= 20
                              ? 'Ritmo rápido'
                              : seconds <= 30
                                ? 'Equilibrado'
                                : seconds <= 45
                                  ? 'Recuperação maior'
                                  : 'Pausa completa'}
                          </small>
                          {selected && <Check size={16} aria-hidden />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 4 && (
                <motion.div
                  className="ab-plan-summary"
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24 }}
                >
                  <div className="ab-plan-summary__lesgo" aria-hidden>
                    {lesgo ? <LottieView data={lesgo} loop={!reduceMotion} contain /> : null}
                  </div>
                  <p className="ab-plan-summary__eyebrow">
                    <Sparkles size={13} /> Tudo preparado
                  </p>
                  <h3>Seu plano está pronto.</h3>
                  <div className="ab-plan-summary__grid ab-plan-summary__grid--five">
                    <span>
                      <Flame size={16} />
                      <small>Intensidade</small>
                      <strong>
                        {draft.mode === 'custom'
                          ? 'Personalizada'
                          : AB_INTENSITY_LABELS[draft.intensity ?? 'moderado']}
                      </strong>
                    </span>
                    <span>
                      <Music2 size={16} />
                      <small>Som</small>
                      <strong>{selectedSound?.nome ?? 'Clássico'}</strong>
                    </span>
                    <span>
                      <Activity size={16} />
                      <small>Agenda</small>
                      <strong>{draft.training_days.length} dias/semana</strong>
                    </span>
                    <span>
                      <TimerReset size={16} />
                      <small>Descanso</small>
                      <strong>{profilePreview.rest_seconds}s entre séries</strong>
                    </span>
                    <span>
                      <Gauge size={16} />
                      <small>Sessão</small>
                      <strong>
                        {exerciseCountForProfile(profilePreview)} ex. · ~
                        {estimateSessionMinutesForProfile(profilePreview)} min
                      </strong>
                    </span>
                  </div>
                </motion.div>
              )}
              {hint && <p className="ab-plan-wizard__hint">{hint}</p>}
            </div>

            <footer className={`ab-plan-wizard__footer${customScreen ? ' is-custom-only' : ''}`}>
              {!customScreen && (
                <GameButton
                  variant="secondary"
                  className={
                    step === 0 && !firstVisit
                      ? 'ab-plan-wizard__back is-placeholder'
                      : 'ab-plan-wizard__back'
                  }
                  disabled={(step === 0 && !firstVisit) || saving}
                  aria-hidden={step === 0 && !firstVisit}
                  tabIndex={step === 0 && !firstVisit ? -1 : undefined}
                  onClick={() => {
                    if (step === 0 && firstVisit) {
                      setPhase('intro');
                      return;
                    }
                    setStep((current) => (current - 1) as NumberedStep);
                  }}
                >
                  <ChevronLeft size={18} aria-hidden /> Voltar
                </GameButton>
              )}
              <GameButton
                className="ab-plan-wizard__next"
                disabled={saving}
                onClick={() => (finalStep ? void save() : goForward())}
              >
                {saving ? (
                  <>
                    <LoaderCircle className="animate-spin" size={18} aria-hidden /> Preparando…
                  </>
                ) : finalStep ? (
                  <>
                    {firstVisit ? 'Começar' : 'Salvar'} <ChevronRight size={18} aria-hidden />
                  </>
                ) : (
                  <>
                    Continuar <ChevronRight size={18} aria-hidden />
                  </>
                )}
              </GameButton>
            </footer>
          </>
        )}
      </Modal>
      <Modal
        open={fieldTip != null}
        onClose={() => setFieldTip(null)}
        labelledBy="ab-plan-field-tip-title"
        panelClassName="ab-plan-field-tip"
      >
        {fieldTip ? (
          <>
            <h3 id="ab-plan-field-tip-title">{FIELD_TIPS[fieldTip].title}</h3>
            <p>{FIELD_TIPS[fieldTip].body}</p>
            <GameButton onClick={() => setFieldTip(null)}>Entendi</GameButton>
          </>
        ) : null}
      </Modal>
      {celebration}
      {fallingLeaves}
    </>
  );
}
