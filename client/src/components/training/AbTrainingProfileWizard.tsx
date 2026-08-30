import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Flame,
  Gauge,
  Goal,
  LoaderCircle,
  MoveHorizontal,
  Sparkles,
  Timer,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import {
  AB_INTENSITY_LABELS,
  AB_VOLUME_LABELS,
  createDefaultAbTrainingProfile,
} from '@shared/ab-training-profile';
import { EQUIPMENT_CATALOG, type EquipmentId } from '@shared/equipment';
import type { AbTrainingIntensity, AbTrainingProfileV2, AbTrainingVolume } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { updateAbTrainingProfileV2 } from '@/lib/api';
import { selectionHaptic, successHaptic } from '@/lib/platform/native-runtime';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';

interface Props {
  open: boolean;
  onClose?: () => void;
  firstVisit?: boolean;
  onReady?: () => void;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const INTENSITY_ICONS = { leve: Activity, moderado: Gauge, evolyn: Flame } as const;
const VOLUME_ICONS = { curto: Zap, equilibrado: Timer, completo: Goal } as const;
const EQUIPMENT_ICONS: Record<Exclude<EquipmentId, 'push_up_board'>, typeof CircleDot> = {
  pull_up_bar: MoveHorizontal,
  ab_wheel: CircleDot,
  stability_ball: CircleDot,
};

const TITLES = [
  'Escolha sua intensidade',
  'Monte sua semana',
  'Defina o ritmo da missão',
  'Selecione seus equipamentos',
  'Seu plano está pronto',
];

export function AbTrainingProfileWizard({ open, onClose, firstVisit, onReady }: Props) {
  const { user, applyUser, refreshUser } = useAuth();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<AbTrainingProfileV2>(
    () => user?.ab_training_profile_v2 ?? createDefaultAbTrainingProfile(),
  );

  useEffect(() => {
    if (!open) return;
    setProfile(user?.ab_training_profile_v2 ?? createDefaultAbTrainingProfile());
    setStep(0);
  }, [open, user?.ab_training_profile_v2]);

  const canContinue = step !== 1 || profile.training_days.length >= 2;
  const equipmentNames = useMemo(
    () =>
      EQUIPMENT_CATALOG.filter(
        (item) => item.id !== 'push_up_board' && profile.equipment[item.id],
      ).map((item) => item.nome),
    [profile.equipment],
  );

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
          <small>Plano de core · {step + 1} de 5</small>
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
        aria-valuemax={5}
        aria-valuenow={step + 1}
      >
        <span style={{ width: `${((step + 1) / 5) * 100}%` }} />
      </div>

      <div className="ab-plan-wizard__content">
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
          <div className="ab-plan-equipment">
            <p className="ab-plan-helper">Selecione apenas o que você já pode usar.</p>
            {EQUIPMENT_CATALOG.filter((item) => item.id !== 'push_up_board').map((item) => {
              const Icon = EQUIPMENT_ICONS[item.id as Exclude<EquipmentId, 'push_up_board'>];
              const selected = profile.equipment[item.id] === true;
              return (
                <motion.button
                  type="button"
                  key={item.id}
                  aria-pressed={selected}
                  className={selected ? 'is-selected' : ''}
                  whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                  onClick={() =>
                    choose((current) => ({
                      equipment: { ...current.equipment, [item.id]: !selected },
                    }))
                  }
                >
                  <span className="ab-plan-equipment__icon">
                    <Icon size={21} aria-hidden />
                  </span>
                  <span className="ab-plan-equipment__copy">
                    <strong>{item.nome}</strong>
                    <small>{item.descricao}</small>
                  </span>
                  <span className="ab-plan-equipment__check" aria-hidden>
                    {selected && <Check size={15} />}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}

        {step === 4 && (
          <motion.div
            className="ab-plan-summary"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
          >
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
                <Trophy size={16} />
                <small>Equipamentos</small>
                <strong>
                  {equipmentNames.length ? equipmentNames.join(', ') : 'Peso corporal'}
                </strong>
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
          onClick={() => (step === 4 ? void save() : setStep((current) => current + 1))}
        >
          {saving ? (
            <>
              <LoaderCircle className="animate-spin" size={18} aria-hidden /> Preparando…
            </>
          ) : step === 4 ? (
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
