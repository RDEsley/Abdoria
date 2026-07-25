import { ArrowLeft } from 'lucide-react';

interface Props {
  eyebrow?: string;
  title: string;
  /** Quando definido, mostra um botão de voltar antes do eyebrow/título. */
  onBack?: () => void;
  children?: React.ReactNode;
}

export function GamePageHeader({ eyebrow, title, onBack, children }: Props) {
  return (
    <header className="game-page-header">
      <div className="flex items-start gap-2.5">
        {onBack && (
          <button
            type="button"
            className="game-page-header__back"
            onClick={onBack}
            aria-label="Voltar"
            title="Voltar"
          >
            <ArrowLeft size={17} aria-hidden />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="game-page-header__eyebrow">{eyebrow}</p>}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="game-page-header__title">{title}</h2>
            {children}
          </div>
        </div>
      </div>
    </header>
  );
}
