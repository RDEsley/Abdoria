import { useState } from 'react';
import { Map, X } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { TrainingProfileModal } from '@/components/onboarding/TrainingProfileModal';
import { useAuth } from '@/context/AuthContext';
import { updateMe } from '@/lib/api';

const MAX_DISMISSALS = 2;

/**
 * Convite dispensável pro re-onboarding (usuários legados ou que pularam o
 * questionário). Some após 2 dispensas — o fluxo segue acessível em Opções.
 */
export function TrainingPlanInviteCard() {
  const { user, applyUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (!user || hidden) return null;

  const jaConfigurou = user.perfil_treino != null && user.perfil_treino.origem !== 'skip';
  const dispensas = user.preferencias?.reonboarding_dispensado ?? 0;
  if (jaConfigurou || dispensas >= MAX_DISMISSALS) return null;

  const dismiss = () => {
    setHidden(true);
    void updateMe({
      preferencias: { ...user.preferencias, reonboarding_dispensado: dispensas + 1 },
    })
      .then((updated) => applyUser(updated))
      .catch(() => undefined);
  };

  return (
    <div className="glass-card relative p-4">
      <button
        type="button"
        onClick={dismiss}
        className="game-icon-btn absolute right-3 top-3"
        aria-label="Dispensar convite"
      >
        <X size={14} />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <span className="mt-0.5 text-emerald-600" aria-hidden>
          <Map size={22} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-stone-900">Nova campanha disponível</p>
          <p className="mt-1 text-xs font-medium text-stone-600">
            O Abdoria agora monta um plano de corpo inteiro pra treinar em casa — responda o
            questionário de treino e receba suas missões da semana.
          </p>
        </div>
      </div>
      <GameButton className="mt-3 w-full" onClick={() => setShowModal(true)}>
        Montar meu plano
      </GameButton>
      <TrainingProfileModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
