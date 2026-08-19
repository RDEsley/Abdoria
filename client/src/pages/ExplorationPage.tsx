import { useNavigate } from 'react-router-dom';
import { AfkPatrolModal } from '@/components/afk/AfkPatrolModal';
import { MiniErrorBoundary } from '@/components/ui/MiniErrorBoundary';

function ExplorationFallback({ onBack }: { onBack: () => void }) {
  return (
    <div className="game-exploration-crash">
      <p className="game-exploration-crash__title">Ops, a Exploração travou.</p>
      <p className="game-exploration-crash__hint">
        Tenta voltar e abrir de novo — se continuar, conta pra gente pelo Reportar bug.
      </p>
      <button type="button" className="game-exploration-crash__btn" onClick={onBack}>
        Voltar
      </button>
    </div>
  );
}

export function ExplorationPage() {
  const navigate = useNavigate();
  const goHome = () => navigate('/');

  return (
    <MiniErrorBoundary fallback={<ExplorationFallback onBack={goHome} />}>
      <AfkPatrolModal open variant="page" onClose={goHome} />
    </MiniErrorBoundary>
  );
}
