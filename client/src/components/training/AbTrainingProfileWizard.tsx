import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, Gauge, Leaf, X } from 'lucide-react';
import {
  AB_INTENSITY_LABELS,
  AB_VOLUME_LABELS,
  createDefaultAbTrainingProfile,
} from '@shared/ab-training-profile';
import { EQUIPMENT_CATALOG, type EquipmentId } from '@shared/equipment';
import type { AbTrainingIntensity, AbTrainingProfileV2, AbTrainingVolume } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { updateAbTrainingProfileV2 } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';

interface Props {
  open: boolean;
  onClose?: () => void;
  firstVisit?: boolean;
  onReady?: () => void;
}

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function AbTrainingProfileWizard({ open, onClose, firstVisit, onReady }: Props) {
  const { user, applyUser, refreshUser } = useAuth();
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

  const titles = [
    'Qual intensidade combina com você?',
    'Quais dias são melhores?',
    'Quanto tempo você quer treinar?',
    'Seus equipamentos',
    'Seu plano está pronto',
  ];
  const canContinue = step !== 1 || profile.training_days.length >= 2;
  const selectedEquipment = useMemo(
    () => Object.values(profile.equipment).filter(Boolean).length,
    [profile.equipment],
  );

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateAbTrainingProfileV2(profile);
      applyUser(updated);
      await refreshUser();
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
          <small>Plano abdominal · {step + 1}/5</small>
          <h2 id="ab-plan-title">{titles[step]}</h2>
        </div>
        {!firstVisit && (
          <button type="button" className="game-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        )}
      </header>
      <div className="ab-plan-wizard__progress" aria-hidden>
        <span style={{ width: `${((step + 1) / 5) * 100}%` }} />
      </div>
      <div className="ab-plan-wizard__content">
        {step === 0 && (
          <div className="ab-plan-options">
            {(['leve', 'moderado', 'evolyn'] as AbTrainingIntensity[]).map((intensity) => (
              <button
                type="button"
                key={intensity}
                className={`ab-plan-option ${profile.intensity === intensity ? 'is-selected' : ''} ${intensity === 'evolyn' ? 'is-evolyn' : ''}`}
                onClick={() => setProfile((p) => ({ ...p, intensity }))}
              >
                <span>{intensity === 'evolyn' ? <Flame /> : <Gauge />}</span>
                <strong>{AB_INTENSITY_LABELS[intensity]}</strong>
                <small>
                  {intensity === 'leve'
                    ? '4–5 exercícios e pausas maiores'
                    : intensity === 'moderado'
                      ? '6–7 exercícios, ritmo equilibrado'
                      : '8–9 exercícios e desafio elevado'}
                </small>
              </button>
            ))}
          </div>
        )}
        {step === 1 && (
          <div>
            <p className="ab-plan-helper">
              Escolha pelo menos dois dias. Você poderá treinar fora da agenda quando quiser.
            </p>
            <div className="ab-plan-days">
              {DAYS.map((label, day) => (
                <button
                  type="button"
                  key={day}
                  aria-pressed={profile.training_days.includes(day)}
                  onClick={() =>
                    setProfile((p) => ({
                      ...p,
                      training_days: p.training_days.includes(day)
                        ? p.training_days.filter((d) => d !== day)
                        : [...p.training_days, day].sort(),
                    }))
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="ab-plan-options">
            {(['curto', 'equilibrado', 'completo'] as AbTrainingVolume[]).map((volume) => (
              <button
                type="button"
                key={volume}
                className={`ab-plan-option ${profile.volume === volume ? 'is-selected' : ''}`}
                onClick={() => setProfile((p) => ({ ...p, volume }))}
              >
                <strong>{AB_VOLUME_LABELS[volume]}</strong>
                <small>
                  {volume === 'curto'
                    ? 'Para dias corridos'
                    : volume === 'equilibrado'
                      ? 'A recomendação padrão'
                      : 'Mais volume por sessão'}
                </small>
              </button>
            ))}
          </div>
        )}
        {step === 3 && (
          <div className="ab-plan-equipment">
            {EQUIPMENT_CATALOG.filter((item) => item.id !== 'push_up_board').map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={profile.equipment[item.id] === true}
                  onChange={(event) =>
                    setProfile((p) => ({
                      ...p,
                      equipment: { ...p.equipment, [item.id as EquipmentId]: event.target.checked },
                    }))
                  }
                />
                <span>
                  <strong>{item.nome}</strong>
                  <small>{item.descricao}</small>
                </span>
              </label>
            ))}
          </div>
        )}
        {step === 4 && (
          <div className="ab-plan-summary">
            <span>
              <Leaf size={30} />
            </span>
            <h3>
              {AB_INTENSITY_LABELS[profile.intensity]} · {AB_VOLUME_LABELS[profile.volume]}
            </h3>
            <p>
              {profile.training_days.length} dias por semana · {selectedEquipment || 'Sem'}{' '}
              equipamento{selectedEquipment === 1 ? '' : 's'}
            </p>
            <small>
              A prescrição respeita exercícios por repetição e por tempo, com progressão preparada
              para os próximos ciclos.
            </small>
          </div>
        )}
      </div>
      <footer className="ab-plan-wizard__footer">
        {step > 0 && (
          <GameButton variant="secondary" onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft size={18} /> Voltar
          </GameButton>
        )}
        <GameButton
          className="flex-1"
          disabled={!canContinue || saving}
          onClick={() => (step === 4 ? void save() : setStep((s) => s + 1))}
        >
          {step === 4 ? (
            saving ? (
              'Preparando…'
            ) : firstVisit ? (
              'Começar primeira missão'
            ) : (
              'Salvar plano'
            )
          ) : (
            <>
              Continuar <ChevronRight size={18} />
            </>
          )}
        </GameButton>
      </footer>
    </Modal>
  );
}
