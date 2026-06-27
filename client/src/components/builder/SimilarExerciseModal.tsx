import { X } from 'lucide-react';
import type { IExerciseDocument } from '@/types';
import { formatExerciseName, formatExercisePrescription } from '@/types';
import { MuscleTag } from '@/components/builder/MuscleTag';
import { GameButton } from '@/components/ui/GameButton';
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
    <div className="game-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="similar-exercise-title">
      <div className="game-modal game-modal--wide max-h-[85vh] overflow-y-auto">
        <button type="button" onClick={onClose} className="game-modal__close-btn" aria-label="Fechar">
          <X size={18} />
        </button>

        <h2 id="similar-exercise-title" className="game-modal__title">
          Trocar exercício
        </h2>
        <p className="game-modal__text">
          Substituir <strong>{sourceName}</strong> por um exercício similar (mesmo foco muscular ou mecânica
          parecida).
        </p>

        {options.length === 0 ? (
          <p className="mt-4 text-sm font-semibold text-stone-500">
            Nenhum exercício similar disponível no momento.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {options.map((option) => {
              const doc = exerciseMap.get(option.slug);
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
                <li key={option.slug} className="glass-card rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-stone-900">
                        {formatExerciseName({
                          nome: option.nome,
                          slug: option.slug,
                          nome_pt: option.nome_pt,
                        })}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <MuscleTag muscle={option.musculo_principal} compact />
                        <span className="text-[0.65rem] font-bold text-stone-500">{prescription}</span>
                      </div>
                    </div>
                    <GameButton size="sm" onClick={() => onSelect(option.slug)}>
                      Usar
                    </GameButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4">
          <GameButton variant="secondary" className="w-full" onClick={onClose}>
            Cancelar
          </GameButton>
        </div>
      </div>
    </div>
  );
}
