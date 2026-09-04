import { useReducedMotion } from 'framer-motion';
import { Leaf, RefreshCw, X } from 'lucide-react';
import { shortBuildId } from '@shared/app-release';
import { useAppUpdate } from '@/context/AppUpdateContext';
import { GameButton } from '@/components/ui/GameButton';

/** Banner discreto de nova release — não força reload sozinho. */
export function AppUpdateBanner() {
  const { promptVisible, applying, standalone, latest, applyUpdate, dismissUpdate } =
    useAppUpdate();
  const reduceMotion = useReducedMotion();

  if (!promptVisible || !latest) return null;

  return (
    <div
      className={`app-update-banner${standalone ? ' app-update-banner--standalone' : ''}${reduceMotion ? ' is-static' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="app-update-banner__icon" aria-hidden>
        <Leaf size={18} />
      </span>
      <div className="app-update-banner__copy">
        <strong>Uma nova versão do Evolyn brotou 🌱</strong>
        <small>
          Atualize para receber as últimas melhorias
          {standalone ? ' no app instalado' : ''}. Recarrega o app.
        </small>
      </div>
      <div className="app-update-banner__actions">
        <GameButton
          size="sm"
          disabled={applying}
          onClick={() => void applyUpdate()}
          className="!w-auto app-update-banner__cta"
        >
          <RefreshCw size={14} aria-hidden className={applying ? 'animate-spin' : undefined} />
          {applying ? 'Atualizando…' : 'Atualizar agora'}
        </GameButton>
        <button
          type="button"
          className="app-update-banner__later"
          disabled={applying}
          onClick={dismissUpdate}
        >
          Depois
        </button>
        <button
          type="button"
          className="app-update-banner__close"
          aria-label="Dispensar"
          disabled={applying}
          onClick={dismissUpdate}
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      <span className="sr-only">build {shortBuildId(latest.build)}</span>
    </div>
  );
}
