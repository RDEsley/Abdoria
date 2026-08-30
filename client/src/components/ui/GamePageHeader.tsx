import { ArrowLeft, X } from 'lucide-react';

interface Props {
  eyebrow?: string;
  title: string;
  /** Quando definido, mostra um botão de voltar antes do eyebrow/título. */
  onBack?: () => void;
  /** 'arrow' (padrão) pra navegação hierárquica de verdade; 'x' quando a
      página é mais uma expansão de um preview (ex.: "ver todas as
      conquistas") do que um nível a mais pra "voltar" — sempre circular. */
  backIcon?: 'arrow' | 'x';
  /** 'left' (padrão) antes do eyebrow/título; 'right' joga o botão pro fim
      da linha, como um "fechar" de canto. */
  backAlign?: 'left' | 'right';
  children?: React.ReactNode;
}

export function GamePageHeader({
  eyebrow,
  title,
  onBack,
  backIcon = 'arrow',
  backAlign = 'left',
  children,
}: Props) {
  const backButton = onBack && (
    <button
      type="button"
      className={`game-page-header__back${backIcon === 'x' ? ' game-page-header__back--circle' : ''}`}
      onClick={onBack}
      aria-label={backIcon === 'x' ? 'Fechar' : 'Voltar'}
      title={backIcon === 'x' ? 'Fechar' : 'Voltar'}
    >
      {backIcon === 'x' ? <X size={18} aria-hidden /> : <ArrowLeft size={17} aria-hidden />}
    </button>
  );

  return (
    <header className="game-page-header">
      <div className="flex items-start gap-2.5">
        {backAlign === 'left' && backButton}
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="game-page-header__eyebrow">{eyebrow}</p>}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="game-page-header__title">{title}</h1>
            {children}
          </div>
        </div>
        {backAlign === 'right' && backButton}
      </div>
    </header>
  );
}
