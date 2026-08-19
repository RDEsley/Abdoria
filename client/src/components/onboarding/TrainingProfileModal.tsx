import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import {
  EquipamentoStep,
  FocoStep,
  FrequenciaStep,
  PartesStep,
  PlanoPreview,
  RestricoesStep,
  ScopeStep,
} from '@/components/onboarding/training-profile-steps';
import {
  DEFAULT_TRAINING_DRAFT,
  draftToPerfilTreino,
  perfilToDraft,
  type TrainingProfileDraft,
} from '@/components/onboarding/training-profile-draft';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import { updateTrainingProfile } from '@/lib/api';

type StepId = 'scope' | 'foco' | 'partes' | 'frequencia' | 'equipamento' | 'restricoes' | 'plano';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Mini-wizard de re-onboarding: só os steps do perfil de treino. */
export function TrainingProfileModal({ open, onClose }: Props) {
  const { user, refreshUser, applyUser } = useAuth();
  const { refresh: refreshApp } = useApp();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [shakeNonce, setShakeNonce] = useState(0);
  const [draft, setDraft] = useState<TrainingProfileDraft>(() => {
    if (user?.perfil_treino) {
      return perfilToDraft(user.perfil_treino, user.preferencias?.equipamentos ?? {});
    }
    const equipamentos = user?.preferencias?.equipamentos ?? {};
    return {
      ...DEFAULT_TRAINING_DRAFT,
      equipamentos,
      equipamentoNenhum: Object.values(equipamentos).every((v) => !v),
    };
  });

  // Este modal fica sempre montado (só `open` muda) — sem isso, reabrir
  // depois de qualquer atualização de perfil (ex.: refeito o onboarding)
  // continuava mostrando o rascunho capturado na primeira montagem.
  useEffect(() => {
    if (!open) return;
    setDraft(
      user?.perfil_treino
        ? perfilToDraft(user.perfil_treino, user.preferencias?.equipamentos ?? {})
        : {
            ...DEFAULT_TRAINING_DRAFT,
            equipamentos: user?.preferencias?.equipamentos ?? {},
            equipamentoNenhum: Object.values(user?.preferencias?.equipamentos ?? {}).every(
              (v) => !v,
            ),
          },
    );
    setStep(0);
    setInvalid(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao abrir, não a cada edição de `user`
  }, [open]);

  const corpoTodo = draft.escopo === 'corpo_todo';
  const steps = useMemo<StepId[]>(
    () => [
      'equipamento',
      'scope',
      'foco',
      ...(corpoTodo ? (['partes'] as StepId[]) : []),
      'frequencia',
      'restricoes',
      ...(corpoTodo ? (['plano'] as StepId[]) : []),
    ],
    [corpoTodo],
  );
  const stepId = steps[Math.min(step, steps.length - 1)];

  const patchDraft = (patch: Partial<TrainingProfileDraft>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const validate = (): string | null => {
    if (stepId === 'scope' && !draft.escopo) return 'Escolha a sua missão.';
    if (stepId === 'foco' && !draft.foco) return 'Selecione seu foco.';
    if (stepId === 'partes' && draft.partes !== null && draft.partes.length === 0) {
      return 'Escolha pelo menos uma parte do corpo, ou use o Recomendado.';
    }
    if (stepId === 'frequencia' && draft.diasSemana.length < 2) {
      return 'Escolha pelo menos 2 dias de treino.';
    }
    return null;
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateTrainingProfile(
        draftToPerfilTreino(draft, 'reonboarding'),
        draft.equipamentos,
      );
      applyUser(updated);
      await Promise.all([refreshUser(), refreshApp()]);
      showGameToast(corpoTodo ? 'Nova campanha ativada!' : 'Plano de treino atualizado.', {
        variant: 'success',
      });
      onClose();
      setStep(0);
    } catch {
      showGameToast('Não foi possível salvar o plano.', { variant: 'warn' });
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    const error = validate();
    if (error) {
      setInvalid(true);
      setShakeNonce((n) => n + 1);
      showGameToast(error, { variant: 'warn' });
      return;
    }
    setInvalid(false);
    if (step < steps.length - 1) setStep((s) => s + 1);
    else void save();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="training-profile-modal-title"
      panelClassName="training-profile-modal"
    >
      <div className="training-profile-modal__head">
        <p id="training-profile-modal-title" className="text-sm font-bold text-teal-700">
          Meu plano de treino · {step + 1}/{steps.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="game-icon-btn shrink-0"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      <div className="training-profile-modal__body">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepId}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className={invalid ? 'onb-invalid' : undefined}
          >
            {stepId === 'scope' && <ScopeStep draft={draft} onChange={patchDraft} />}
            {stepId === 'foco' && <FocoStep draft={draft} onChange={patchDraft} />}
            {stepId === 'partes' && <PartesStep draft={draft} onChange={patchDraft} />}
            {stepId === 'frequencia' && <FrequenciaStep draft={draft} onChange={patchDraft} />}
            {stepId === 'equipamento' && <EquipamentoStep draft={draft} onChange={patchDraft} />}
            {stepId === 'restricoes' && <RestricoesStep draft={draft} onChange={patchDraft} />}
            {stepId === 'plano' && (
              <>
                <h2 className="text-2xl font-extrabold">Sua Campanha</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {draft.frequencia} missões por semana, montadas pro seu foco.
                </p>
                <PlanoPreview draft={draft} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="training-profile-modal__footer">
        {step > 0 && (
          <GameButton
            type="button"
            variant="secondary"
            onClick={() => {
              setInvalid(false);
              setStep((s) => s - 1);
            }}
            className="flex items-center gap-1"
          >
            <ChevronLeft size={18} /> Voltar
          </GameButton>
        )}
        <motion.div
          key={shakeNonce}
          className="flex-1"
          animate={shakeNonce > 0 ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : undefined}
          transition={{ duration: 0.4 }}
        >
          <GameButton
            onClick={next}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2"
          >
            {step === steps.length - 1 ? (saving ? 'Salvando...' : 'Salvar plano') : 'Continuar'}
            <ChevronRight size={18} />
          </GameButton>
        </motion.div>
      </div>
    </Modal>
  );
}
