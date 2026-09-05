import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { LottieView } from '@/components/ui/LottieView';
import { BrandMark } from '@/components/brand/BrandMark';
import { useLottieAsset } from '@/hooks/useLottieAsset';
import { useAuth } from '@/hooks/useAuth';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import { updateMe } from '@/lib/api/users';
import { upsertNutritionProfile } from '@/lib/api/nutrition';
import {
  DIET_STYLES,
  MEAL_TYPE_LABELS,
  estimateNutritionTargets,
  type DietStyle,
  type NutritionGoal,
  type NutritionMealReminder,
  type NutritionProfile,
  type NutritionTargetMode,
} from '@shared/nutrition';
import type { SexoBiologico } from '@/types';
import {
  GOAL_OPTIONS,
  defaultMealReminders,
  dietStyleFlags,
  NUTRITION_CORE_MEALS,
} from './nutrition-utils';

type NumberedStep = 0 | 1 | 2 | 3 | 4;

const STEP_TITLES = [
  'Qual é o seu ritmo?',
  'Seus dados',
  'Preferências',
  'Rotina de refeições',
  'Seu plano',
];

const DIET_LABELS: Record<DietStyle, string> = {
  omnivore: 'Onívoro',
  vegetarian: 'Vegetariano',
  vegan: 'Vegano',
  lactose_free: 'Sem lactose',
};

interface BodyDraft {
  idade: string;
  altura_cm: string;
  peso_kg: string;
  sexo: SexoBiologico | '';
}

interface WizardDraft {
  goal: NutritionGoal | null;
  body: BodyDraft;
  diet_style: DietStyle;
  avoid_foods: string;
  allergies_note: string;
  meals: NutritionMealReminder[];
}

function emptyDraft(userBody: BodyDraft): WizardDraft {
  return {
    goal: null,
    body: userBody,
    diet_style: 'omnivore',
    avoid_foods: '',
    allergies_note: '',
    meals: defaultMealReminders(),
  };
}

function draftFromProfile(profile: NutritionProfile | null, userBody: BodyDraft): WizardDraft {
  const prefs = profile?.preferences ?? {};
  return {
    goal: profile?.goal ?? 'maintain',
    body: userBody,
    diet_style:
      prefs.diet_style ??
      (prefs.vegan ? 'vegan' : prefs.vegetarian ? 'vegetarian' : prefs.lactose_free ? 'lactose_free' : 'omnivore'),
    avoid_foods: (prefs.avoid_foods ?? []).join(', '),
    allergies_note: prefs.allergies_note ?? '',
    meals: defaultMealReminders(prefs.meal_reminders),
  };
}

function bodyFromUser(user: {
  idade?: number;
  altura_cm?: number;
  peso_kg?: number;
  simulacao_definicao?: { sexo?: SexoBiologico };
} | null): BodyDraft {
  return {
    idade: user?.idade != null ? String(user.idade) : '',
    altura_cm: user?.altura_cm != null ? String(user.altura_cm) : '',
    peso_kg: user?.peso_kg != null ? String(user.peso_kg) : '',
    sexo: user?.simulacao_definicao?.sexo ?? '',
  };
}

function needsBiometrics(goal: NutritionGoal | null): boolean {
  return goal != null && goal !== 'track';
}

function missingBodyFields(body: BodyDraft): string[] {
  const missing: string[] = [];
  if (!body.peso_kg || Number(body.peso_kg) < 30) missing.push('peso');
  if (!body.altura_cm || Number(body.altura_cm) < 120) missing.push('altura');
  if (!body.idade || Number(body.idade) < 14) missing.push('idade');
  if (!body.sexo) missing.push('sexo');
  return missing;
}

export function NutritionSetupWizard({
  open,
  mode,
  profile,
  onClose,
  onCompleted,
}: {
  open: boolean;
  mode: 'first' | 'edit';
  profile: NutritionProfile | null;
  onClose: () => void;
  onCompleted: (profile: NutritionProfile) => void;
}) {
  const { user, applyUser, refreshUser } = useAuth();
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<'intro' | 'steps'>(mode === 'first' ? 'intro' : 'steps');
  const [step, setStep] = useState<NumberedStep>(0);
  const [draft, setDraft] = useState<WizardDraft>(() =>
    mode === 'edit'
      ? draftFromProfile(profile, bodyFromUser(user))
      : emptyDraft(bodyFromUser(user)),
  );
  const [hint, setHint] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const showIntro = open && phase === 'intro';
  const cooking = useLottieAsset('/assets/cooking.json', showIntro);

  useEffect(() => {
    if (!open) return;
    const body = bodyFromUser(user);
    if (mode === 'edit') {
      setDraft(draftFromProfile(profile, body));
      setPhase('steps');
      setStep(0);
    } else {
      setDraft(emptyDraft(body));
      setPhase('intro');
      setStep(0);
    }
    setHint(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const preview = useMemo(() => {
    if (!draft.goal || draft.goal === 'track') {
      return {
        target_mode: 'none' as NutritionTargetMode,
        calorie_target: null as number | null,
        protein_target_g: null as number | null,
        carbs_target_g: null as number | null,
        fat_target_g: null as number | null,
      };
    }
    const estimated = estimateNutritionTargets({
      goal: draft.goal,
      sexo: draft.body.sexo || null,
      idade: Number(draft.body.idade) || null,
      peso_kg: Number(draft.body.peso_kg) || null,
      altura_cm: Number(draft.body.altura_cm) || null,
    });
    if (!estimated) {
      return {
        target_mode: 'estimated' as NutritionTargetMode,
        calorie_target: null,
        protein_target_g: null,
        carbs_target_g: null,
        fat_target_g: null,
      };
    }
    return estimated;
  }, [draft.goal, draft.body]);

  const validate = (current: NumberedStep): string | null => {
    if (current === 0 && !draft.goal) return 'Escolha um objetivo para continuar.';
    if (current === 1 && needsBiometrics(draft.goal)) {
      const missing = missingBodyFields(draft.body);
      if (missing.length > 0) {
        return 'Para estimar a referência, complete peso, altura, idade e sexo.';
      }
    }
    if (current === 3) {
      const enabled = draft.meals.filter((meal) => meal.enabled);
      if (enabled.length === 0) return 'Ative ao menos uma refeição.';
      if (enabled.some((meal) => !/^\d{1,2}:\d{2}$/.test(meal.time))) {
        return 'Confira os horários das refeições.';
      }
    }
    return null;
  };

  const goForward = () => {
    const message = validate(step);
    if (message) {
      setHint(message);
      return;
    }
    setHint(null);
    setStep((current) => Math.min(4, current + 1) as NumberedStep);
  };

  const save = async () => {
    const message = validate(3) ?? (draft.goal ? null : 'Escolha um objetivo.');
    if (message) {
      setHint(message);
      return;
    }
    setSaving(true);
    try {
      if (needsBiometrics(draft.goal) || draft.body.peso_kg || draft.body.idade) {
        const updated = await updateMe({
          idade: draft.body.idade ? Number(draft.body.idade) : undefined,
          altura_cm: draft.body.altura_cm ? Number(draft.body.altura_cm) : undefined,
          peso_kg: draft.body.peso_kg ? Number(draft.body.peso_kg) : undefined,
          simulacao_definicao: draft.body.sexo
            ? {
                gordura_meta_pct: user?.simulacao_definicao?.gordura_meta_pct ?? 20,
                ...(user?.simulacao_definicao ?? {}),
                sexo: draft.body.sexo,
              }
            : undefined,
        });
        applyUser(updated);
      }

      const flags = dietStyleFlags(draft.diet_style);
      const avoid = draft.avoid_foods
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 24);

      const body =
        draft.goal === 'track'
          ? {
              goal: 'track' as const,
              target_mode: 'none' as const,
              calorie_target: null,
              protein_target_g: null,
              carbs_target_g: null,
              fat_target_g: null,
              preferences: {
                diet_style: draft.diet_style,
                ...flags,
                avoid_foods: avoid,
                allergies_note: draft.allergies_note.trim() || undefined,
                meal_reminders: draft.meals,
              },
              setup_completed: true,
            }
          : {
              goal: draft.goal!,
              target_mode: 'estimated' as const,
              reestimate: true,
              preferences: {
                diet_style: draft.diet_style,
                ...flags,
                avoid_foods: avoid,
                allergies_note: draft.allergies_note.trim() || undefined,
                meal_reminders: draft.meals,
              },
              setup_completed: true,
            };

      const saved = await upsertNutritionProfile(body);
      await refreshUser();
      showGameToast('Plano alimentar pronto. Bora no seu ritmo.', { variant: 'success' });
      onCompleted(saved);
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível salvar o plano.'), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateMeal = (mealType: string, patch: Partial<NutritionMealReminder>) => {
    setDraft((current) => ({
      ...current,
      meals: current.meals.map((meal) =>
        meal.meal_type === mealType ? { ...meal, ...patch } : meal,
      ),
    }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="nutrition-setup-title"
      overlayClassName="nutrition-wizard-overlay"
      panelClassName="nutrition-wizard"
      lockScroll={false}
      trapFocus={false}
      autoFocus={false}
      disableDismiss={mode === 'first' && phase === 'intro' ? false : saving}
    >
      {phase === 'intro' ? (
        <div className="nutrition-wizard-intro">
          <button
            type="button"
            className="game-icon-btn nutrition-wizard-intro__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={18} aria-hidden />
          </button>
          {cooking ? (
            <div className="nutrition-wizard-intro__lottie" aria-hidden>
              <LottieView data={cooking} loop={!reduceMotion} contain />
            </div>
          ) : (
            <BrandMark size={120} alt="" />
          )}
          <h2 id="nutrition-setup-title">Alimentação no seu ritmo</h2>
          <p className="nutrition-wizard-intro__tag">Registrar, equilibrar e seguir leve.</p>
          <p>
            Monte um plano simples: objetivo, preferências e horários. Sem pressão, sem farm — só o
            que cabe no seu dia.
          </p>
          <GameButton
            className="nutrition-wizard-intro__cta"
            onClick={() => {
              setPhase('steps');
              setStep(0);
            }}
          >
            Começar
          </GameButton>
        </div>
      ) : (
        <>
          <header className="nutrition-wizard__header">
            <div>
              <small>
                Plano alimentar · {step + 1} de {STEP_TITLES.length}
              </small>
              <h2 id="nutrition-setup-title">{STEP_TITLES[step]}</h2>
            </div>
            <button type="button" className="game-icon-btn" onClick={onClose} aria-label="Fechar">
              <X size={18} />
            </button>
          </header>

          <div className="nutrition-wizard__progress" aria-hidden>
            {STEP_TITLES.map((_, index) => (
              <span key={index} className={index <= step ? 'is-on' : undefined} />
            ))}
          </div>

          <div className="nutrition-wizard__content">
            {step === 0 && (
              <div className="nutrition-choice-grid">
                {GOAL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={draft.goal === option.id ? 'is-selected' : undefined}
                    onClick={() => {
                      setHint(null);
                      setDraft((current) => ({ ...current, goal: option.id }));
                    }}
                  >
                    <strong>{option.title}</strong>
                    <small>{option.hint}</small>
                  </button>
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="nutrition-form-grid">
                {!needsBiometrics(draft.goal) ? (
                  <p className="nutrition-wizard-note">
                    No modo só registrar, os dados corporais são opcionais. Você pode preenchê-los
                    depois se quiser uma referência.
                  </p>
                ) : (
                  <p className="nutrition-wizard-note">
                    Usamos peso, altura, idade e sexo só para estimar uma referência gentil — não é
                    orientação clínica.
                  </p>
                )}
                <label>
                  Idade
                  <input
                    className="game-input mt-1 w-full"
                    inputMode="numeric"
                    value={draft.body.idade}
                    onChange={(e) =>
                      setDraft((current) => ({
                        ...current,
                        body: { ...current.body, idade: e.target.value },
                      }))
                    }
                  />
                </label>
                <label>
                  Altura (cm)
                  <input
                    className="game-input mt-1 w-full"
                    inputMode="numeric"
                    value={draft.body.altura_cm}
                    onChange={(e) =>
                      setDraft((current) => ({
                        ...current,
                        body: { ...current.body, altura_cm: e.target.value },
                      }))
                    }
                  />
                </label>
                <label>
                  Peso (kg)
                  <input
                    className="game-input mt-1 w-full"
                    inputMode="decimal"
                    value={draft.body.peso_kg}
                    onChange={(e) =>
                      setDraft((current) => ({
                        ...current,
                        body: { ...current.body, peso_kg: e.target.value },
                      }))
                    }
                  />
                </label>
                <div>
                  <p className="text-sm font-semibold text-stone-700 mb-2">Sexo biológico</p>
                  <div className="nutrition-serving-row">
                    {(
                      [
                        ['masculino', 'Masculino'],
                        ['feminino', 'Feminino'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={draft.body.sexo === id ? 'is-on' : undefined}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            body: { ...current.body, sexo: id },
                          }))
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="nutrition-form-grid">
                <div>
                  <p className="text-sm font-semibold text-stone-700 mb-2">Estilo alimentar</p>
                  <div className="nutrition-choice-grid nutrition-choice-grid--compact">
                    {DIET_STYLES.map((style) => (
                      <button
                        key={style}
                        type="button"
                        className={draft.diet_style === style ? 'is-selected' : undefined}
                        onClick={() =>
                          setDraft((current) => ({ ...current, diet_style: style }))
                        }
                      >
                        <strong>{DIET_LABELS[style]}</strong>
                      </button>
                    ))}
                  </div>
                </div>
                <label>
                  Evitar (opcional)
                  <input
                    className="game-input mt-1 w-full"
                    value={draft.avoid_foods}
                    onChange={(e) =>
                      setDraft((current) => ({ ...current, avoid_foods: e.target.value }))
                    }
                    placeholder="Ex.: fritura, refrigerante"
                  />
                </label>
                <label>
                  Alergias / observações
                  <textarea
                    className="game-input mt-1 w-full min-h-[5rem]"
                    value={draft.allergies_note}
                    onChange={(e) =>
                      setDraft((current) => ({ ...current, allergies_note: e.target.value }))
                    }
                    placeholder="Alergias ou restrições importantes"
                  />
                </label>
                <p className="nutrition-wizard-disclaimer">
                  O Evolyn não verifica alergênicos automaticamente. Sempre confira rótulos e
                  ingredientes — esta nota é só um lembrete pessoal.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="nutrition-meal-routine">
                {NUTRITION_CORE_MEALS.map((mealType) => {
                  const meal = draft.meals.find((item) => item.meal_type === mealType)!;
                  return (
                    <div key={mealType} className="nutrition-meal-routine__row">
                      <label className="nutrition-meal-routine__toggle">
                        <input
                          type="checkbox"
                          checked={meal.enabled}
                          onChange={(e) =>
                            updateMeal(mealType, { enabled: e.target.checked })
                          }
                        />
                        <span>{MEAL_TYPE_LABELS[mealType]}</span>
                      </label>
                      <input
                        className="game-input"
                        type="time"
                        value={meal.time}
                        disabled={!meal.enabled}
                        onChange={(e) => updateMeal(mealType, { time: e.target.value })}
                      />
                    </div>
                  );
                })}
                <p className="nutrition-wizard-note">
                  Horários em America/Sao_Paulo. Você pode ajustar depois no plano alimentar.
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="nutrition-review">
                <p>
                  <strong>Objetivo:</strong>{' '}
                  {GOAL_OPTIONS.find((item) => item.id === draft.goal)?.title ?? '—'}
                </p>
                <p>
                  <strong>Estilo:</strong> {DIET_LABELS[draft.diet_style]}
                </p>
                <p>
                  <strong>Referência:</strong>{' '}
                  {draft.goal === 'track'
                    ? 'sem meta calórica'
                    : preview.calorie_target != null
                      ? `~${preview.calorie_target} kcal · P ${preview.protein_target_g}g · C ${preview.carbs_target_g}g · G ${preview.fat_target_g}g`
                      : 'estimativa pendente de dados'}
                </p>
                <p>
                  <strong>Refeições:</strong>{' '}
                  {draft.meals
                    .filter((meal) => meal.enabled)
                    .map((meal) => `${meal.label} ${meal.time}`)
                    .join(' · ')}
                </p>
                <p className="nutrition-wizard-disclaimer">
                  Referência de bem-estar — não substitui orientação profissional.
                </p>
              </div>
            )}

            {hint && <p className="nutrition-wizard-hint">{hint}</p>}
          </div>

          <footer className="nutrition-wizard__footer">
            <GameButton
              variant="ghost"
              className="!w-auto px-3"
              disabled={step === 0 || saving}
              onClick={() => {
                setHint(null);
                setStep((current) => Math.max(0, current - 1) as NumberedStep);
              }}
            >
              <ChevronLeft size={16} /> Voltar
            </GameButton>
            {step < 4 ? (
              <GameButton className="!w-auto px-4" onClick={goForward}>
                Continuar <ChevronRight size={16} />
              </GameButton>
            ) : (
              <GameButton className="!w-auto px-4" disabled={saving} onClick={() => void save()}>
                {saving ? 'Salvando…' : 'Usar este plano'}
              </GameButton>
            )}
          </footer>
        </>
      )}
    </Modal>
  );
}
