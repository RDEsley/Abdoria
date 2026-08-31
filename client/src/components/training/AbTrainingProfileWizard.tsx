import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Gauge,
  Goal,
  LoaderCircle,
  PersonStanding,
  Sparkles,
  Timer,
  TimerReset,
  X,
  Zap,
} from 'lucide-react';
import {
  AB_INTENSITY_LABELS,
  AB_VOLUME_LABELS,
  createDefaultAbTrainingProfile,
} from '@shared/ab-training-profile';
import type {
  AbTrainingIntensity,
  AbTrainingProfileV2,
  AbTrainingVolume,
  IUserDocument,
} from '@/types';
import { useAuth } from '@/context/AuthContext';
import { updateAbTrainingProfileV2 } from '@/lib/api';
import { selectionHaptic, successHaptic } from '@/lib/platform/native-runtime';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { LottieView } from '@/components/ui/LottieView';
import { useLottieAsset } from '@/hooks/useLottieAsset';

interface Props {
  open: boolean;
  onClose?: () => void;
  firstVisit?: boolean;
  onReady?: () => void;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const INTENSITY_ICONS = { leve: Activity, moderado: Gauge, evolyn: Flame } as const;
const VOLUME_ICONS = { curto: Zap, equilibrado: Timer, completo: Goal } as const;
const TITLES = [
  'Escolha sua intensidade',
  'Monte sua semana',
  'Defina o ritmo da missão',
  'Escolha seu descanso',
  'Seu plano está pronto',
];
const TOTAL_STEPS = TITLES.length;
const REST_OPTIONS = [20, 30, 45, 60] as const;

function resolveProfile(user: IUserDocument | null): AbTrainingProfileV2 {
  const restSeconds = user?.preferencias?.descanso_padrao_seg ?? 30;
  if (!user?.ab_training_profile_v2) {
    return createDefaultAbTrainingProfile(undefined, restSeconds);
  }
  return {
    ...user.ab_training_profile_v2,
    rest_seconds: user.ab_training_profile_v2.rest_seconds ?? restSeconds,
  };
}

export function AbTrainingProfileWizard({ open, onClose, firstVisit, onReady }: Props) {
  const { user, applyUser, refreshUser } = useAuth();
  const reduceMotion = useReducedMotion();
  const confetti = useLottieAsset('/assets/Confetti.json');
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<AbTrainingProfileV2>(() => resolveProfile(user));

  useEffect(() => {
    if (!open) return;
    setProfile(resolveProfile(user));
    setStep(0);
  }, [open, user]);

  const canContinue = step !== 1 || profile.training_days.length >= 2;
  const choose = (update: (current: AbTrainingProfileV2) => Partial<AbTrainingProfileV2>) => {
    void selectionHaptic();
    setProfile((current) => ({ ...current, ...update(current) }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateAbTrainingProfileV2(profile);
      applyUser(updated);
      await refreshUser();
      await successHaptic();
      showGameToast('Plano abdominal atualizado.', { variant: 'success' });
      onReady?.();
      onClose?.();
    } catch {
      showGameToast('Não foi possível salvar seu plano.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !firstVisit && onClose?.()}
      labelledBy="ab-plan-title"
      panelClassName="ab-plan-wizard"
    >
      <header className="ab-plan-wizard__header">
        <div>
          <small>
            Plano de core · {step + 1} de {TOTAL_STEPS}
          </small>
          <h2 id="ab-plan-title">{TITLES[step]}</h2>
        </div>
        {!firstVisit && (
          <button type="button" className="game-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} aria-hidden />
          </button>
        )}
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

      <div className="ab-plan-wizard__content">
        {!reduceMotion && step > 0 && (
          <span className="ab-plan-step-leaves" key={`leaves-${step}`} aria-hidden>
            {Array.from({ length: 12 }, (_, index) => (
              <i key={index} />
            ))}
          </span>
        )}
        {step === 0 && (
          <div className="ab-plan-options" role="radiogroup" aria-label="Intensidade">
            {(['leve', 'moderado', 'evolyn'] as AbTrainingIntensity[]).map((intensity) => {
              const Icon = INTENSITY_ICONS[intensity];
              const selected = profile.intensity === intensity;
              return (
                <motion.button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  key={intensity}
                  className={`ab-plan-option ${selected ? 'is-selected' : ''} ${intensity === 'evolyn' ? 'is-evolyn' : ''}`}
                  whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                  onClick={() => choose(() => ({ intensity }))}
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
                        : '8–9 exercícios e uma missão mais intensa.'}
                  </small>
                  {selected && <Check className="ab-plan-option__check" size={17} aria-hidden />}
                </motion.button>
              );
            })}
          </div>
        )}

        {step === 1 && (
          <div className="ab-plan-days-step">
            <p className="ab-plan-helper">
              Escolha pelo menos dois dias. Fora da agenda, você ainda pode treinar quando quiser.
            </p>
            <div className="ab-plan-days" aria-label="Dias de treino">
              {DAYS.map((label, day) => (
                <motion.button
                  type="button"
                  key={day}
                  aria-pressed={profile.training_days.includes(day)}
                  whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                  onClick={() =>
                    choose((current) => ({
                      training_days: current.training_days.includes(day)
                        ? current.training_days.filter((entry) => entry !== day)
                        : [...current.training_days, day].sort(),
                    }))
                  }
                >
                  <span>{label}</span>
                  {profile.training_days.includes(day) && <Check size={13} aria-hidden />}
                </motion.button>
              ))}
            </div>
            <p className="ab-plan-days-step__count">
              {profile.training_days.length} dias selecionados
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="ab-plan-options" role="radiogroup" aria-label="Duração da missão">
            {(['curto', 'equilibrado', 'completo'] as AbTrainingVolume[]).map((volume) => {
              const Icon = VOLUME_ICONS[volume];
              const selected = profile.volume === volume;
              return (
                <motion.button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  key={volume}
                  className={`ab-plan-option ${selected ? 'is-selected' : ''}`}
                  whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                  onClick={() => choose(() => ({ volume }))}
                >
                  <span>
                    <Icon size={22} aria-hidden />
                  </span>
                  <strong>{AB_VOLUME_LABELS[volume]}</strong>
                  <small>
                    {volume === 'curto'
                      ? 'Uma dose eficiente para dias corridos.'
                      : volume === 'equilibrado'
                        ? 'Tempo e volume para a rotina padrão.'
                        : 'Uma sessão completa com maior volume.'}
                  </small>
                  {selected && <Check className="ab-plan-option__check" size={17} aria-hidden />}
                </motion.button>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="ab-plan-rest-step" role="radiogroup" aria-label="Descanso entre séries">
            <p className="ab-plan-helper">
              Esse tempo será respeitado pelo Player e poderá ser ajustado durante o treino.
            </p>
            <div className="ab-plan-rest-options">
              {REST_OPTIONS.map((seconds) => {
                const selected = profile.rest_seconds === seconds;
                return (
                  <motion.button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    key={seconds}
                    className={selected ? 'is-selected' : ''}
                    whileTap={reduceMotion ? undefined : { scale: 0.94, rotate: -1 }}
                    onClick={() => choose(() => ({ rest_seconds: seconds }))}
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
            {!reduceMotion && confetti != null && (
              <span className="ab-plan-summary__confetti" aria-hidden>
                <LottieView data={confetti} loop={false} />
              </span>
            )}
            {!reduceMotion && (
              <span className="ab-plan-summary__particles" aria-hidden>
                {Array.from({ length: 7 }, (_, index) => (
                  <i key={index} />
                ))}
              </span>
            )}
            <span className="ab-plan-summary__success">
              <CheckCircle2 size={32} aria-hidden />
            </span>
            <p className="ab-plan-summary__eyebrow">
              <Sparkles size={13} /> Tudo preparado
            </p>
            <h3>Seu plano está pronto.</h3>
            <div className="ab-plan-summary__grid">
              <span>
                <Flame size={16} />
                <small>Intensidade</small>
                <strong>{AB_INTENSITY_LABELS[profile.intensity]}</strong>
              </span>
              <span>
                <Timer size={16} />
                <small>Duração</small>
                <strong>{AB_VOLUME_LABELS[profile.volume]}</strong>
              </span>
              <span>
                <Activity size={16} />
                <small>Agenda</small>
                <strong>{profile.training_days.length} dias/semana</strong>
              </span>
              <span>
                <PersonStanding size={16} />
                <small>Modalidade</small>
                <strong>Peso corporal</strong>
              </span>
              <span>
                <TimerReset size={16} />
                <small>Descanso</small>
                <strong>{profile.rest_seconds}s entre séries</strong>
              </span>
            </div>
          </motion.div>
        )}
      </div>

      <footer className="ab-plan-wizard__footer">
        <GameButton
          variant="secondary"
          className={step === 0 ? 'ab-plan-wizard__back is-placeholder' : 'ab-plan-wizard__back'}
          disabled={step === 0 || saving}
          aria-hidden={step === 0}
          tabIndex={step === 0 ? -1 : undefined}
          onClick={() => setStep((current) => current - 1)}
        >
          <ChevronLeft size={18} aria-hidden /> Voltar
        </GameButton>
        <GameButton
          className="ab-plan-wizard__next"
          disabled={!canContinue || saving}
          onClick={() =>
            step === TOTAL_STEPS - 1 ? void save() : setStep((current) => current + 1)
          }
        >
          {saving ? (
            <>
              <LoaderCircle className="animate-spin" size={18} aria-hidden /> Preparando…
            </>
          ) : step === TOTAL_STEPS - 1 ? (
            <>
              {firstVisit ? 'Começar primeira missão' : 'Salvar plano'}{' '}
              <ChevronRight size={18} aria-hidden />
            </>
          ) : (
            <>
              Continuar <ChevronRight size={18} aria-hidden />
            </>
          )}
        </GameButton>
      </footer>
    </Modal>
  );
}
