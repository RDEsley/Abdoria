import { X } from 'lucide-react';
import type { IExerciseDocument } from '@/types';
import { formatExerciseName, formatExercisePrescription } from '@/types';
import { MuscleTag } from '@/components/builder/MuscleTag';
import { GameButton } from '@/components/ui/GameButton';
import { exerciseMediaUrl } from '@/lib/media';
import type { SimilarExerciseRef } from '@/components/builder/similar-exercises';

export interface SimilarExerciseOption extends SimilarExerciseRef {
  nome: string;
  nome_pt?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sourceName: string;
  options: SimilarExerciseOption[];
  exerciseMap: Map<string, IExerciseDocument>;
  onSelect: (slug: string) => void;
}

function ExerciseGifThumb({ slug, name }: { slug: string; name: string }) {
  return (
    <span className="game-swap-option__thumb" aria-hidden>
      <img
        src={exerciseMediaUrl(slug)}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent && !parent.querySelector('.game-swap-option__thumb-fallback')) {
            const fallback = document.createElement('span');
            fallback.className = 'game-swap-option__thumb-fallback';
            fallback.textContent = name[0]?.toUpperCase() ?? '?';
            parent.appendChild(fallback);
          }
        }}
      />
    </span>
  );
}

export function SimilarExerciseModal({
  open,
  onClose,
  sourceName,
  options,
  exerciseMap,
  onSelect,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="game-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="similar-exercise-title"
      onClick={onClose}
    >
      <div
        className="game-modal game-modal--wide game-swap-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="game-swap-modal__header">
          <h2 id="similar-exercise-title" className="game-modal__title">
            Trocar exercício
          </h2>
          <p className="game-modal__text">
            Substituir <strong>{sourceName}</strong> por um similar (mesmo foco muscular ou mecânica parecida).
          </p>
          <button type="button" onClick={onClose} className="game-modal__close-btn" aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <div className="game-swap-modal__body">
          {options.length === 0 ? (
            <p className="py-6 text-center text-sm font-semibold text-stone-500">
              Nenhum exercício similar disponível no momento.
            </p>
          ) : (
            <ul className="game-swap-list">
              {options.map((option) => {
                const doc = exerciseMap.get(option.slug);
                const displayName = formatExerciseName({
                  nome: option.nome,
                  slug: option.slug,
                  nome_pt: option.nome_pt,
                });
                const prescription = doc
                  ? formatExercisePrescription({
                      modo: option.modo,
                      series: 3,
                      repeticoes: doc.repeticoes_intermediario,
                      tempo_seg: doc.tempo_seg_intermediario,
                    })
                  : option.modo === 'tempo'
                    ? 'Isometria'
                    : 'Repetições';

                return (
                  <li key={option.slug} className="game-swap-option">
                    <ExerciseGifThumb slug={option.slug} name={option.nome} />
                    <div className="game-swap-option__info">
                      <p className="game-swap-option__name">{displayName}</p>
                      <div className="game-swap-option__meta">
                        <MuscleTag muscle={option.musculo_principal} compact />
                        <span className="game-swap-option__prescription">{prescription}</span>
                      </div>
                    </div>
                    <GameButton size="sm" className="game-swap-option__btn" onClick={() => onSelect(option.slug)}>
                      Usar
                    </GameButton>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="game-swap-modal__footer">
          <GameButton variant="secondary" size="lg" className="w-full" onClick={onClose}>
            Cancelar
          </GameButton>
        </footer>
      </div>
    </div>
  );
}
