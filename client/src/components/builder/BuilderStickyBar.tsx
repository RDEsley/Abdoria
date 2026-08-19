import { Dumbbell, ListChecks, Play, Timer, X } from 'lucide-react';

interface Props {
  exerciseCount: number;
  estimatedMinutes: number | null;
  disabled: boolean;
  onStart: () => void;
  /** Atividades na fila do dia — entram na sequência depois do treino. */
  atividadesNaFila?: number;
  /** Presente = mostra o X pra tirar as atividades da fila sem sair do Construtor. */
  onRemoverAtividades?: () => void;
}

export function BuilderStickyBar({
  exerciseCount,
  estimatedMinutes,
  disabled,
  onStart,
  atividadesNaFila = 0,
  onRemoverAtividades,
}: Props) {
  const hasTime = estimatedMinutes !== null && exerciseCount > 0;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-40 md:bottom-0 md:left-64"
      aria-hidden={false}
    >
      <div className="pointer-events-auto w-full bg-white/95 px-4 py-3 shadow-[0_-6px_24px_rgba(28,25,23,0.1)] backdrop-blur-md [border-top:3px_solid_var(--game-ink)] md:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="builder-start-pills flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
            <span className="builder-start-pill builder-start-pill--time">
              <Timer size={13} aria-hidden />
              {hasTime ? `~${estimatedMinutes} min` : '-- min'}
            </span>
            <span className="builder-start-pill builder-start-pill--count">
              <Dumbbell size={13} aria-hidden />
              {exerciseCount} exercício{exerciseCount !== 1 ? 's' : ''}
            </span>
            {atividadesNaFila > 0 && (
              <span
                className="builder-start-pill builder-start-pill--atividades"
                title="Suas atividades entram na sequência depois do treino"
              >
                <ListChecks size={13} aria-hidden />+{atividadesNaFila} atividade
                {atividadesNaFila !== 1 ? 's' : ''}
                {onRemoverAtividades && (
                  <button
                    type="button"
                    className="builder-start-pill__remove"
                    aria-label="Tirar atividades do treino de hoje"
                    title="Tirar atividades do treino de hoje"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoverAtividades();
                    }}
                  >
                    <X size={11} aria-hidden />
                  </button>
                )}
              </span>
            )}
          </div>
          <button type="button" className="builder-start-btn" onClick={onStart} disabled={disabled}>
            <span className="builder-start-btn__icon" aria-hidden>
              <Play size={18} fill="currentColor" />
            </span>
            Iniciar
          </button>
        </div>
      </div>
    </div>
  );
}
