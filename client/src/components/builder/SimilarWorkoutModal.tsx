import { X } from 'lucide-react';
import type { IExerciseDocument, IWorkoutPresetDocument, SavedWorkoutPreset } from '@/types';
import { savedWorkoutSummary, toSavedPresetId } from '@/types';
import { MuscleTagGroup } from '@/components/builder/MuscleTag';
import { getPresetPrimaryMuscles, getSavedWorkoutMuscles } from '@/components/builder/builder-muscles';
import { PreferenceToggleButtons } from '@/components/library/PreferenceToggleButtons';
import { GameButton } from '@/components/ui/GameButton';

interface Props {
  open: boolean;
  onClose: () => void;
  similarPresets: IWorkoutPresetDocument[];
  similarSaved: SavedWorkoutPreset[];
  exerciseMap: Map<string, IExerciseDocument>;
  currentSelectionId: string | 'custom';
  fixedWorkoutIds: string[];
  blockedWorkoutIds: string[];
  onSelectPreset: (id: string) => void;
  onSelectSaved: (id: string) => void;
  onToggleWorkoutPin: (presetId: string) => void;
  onToggleWorkoutBlock: (presetId: string) => void;
}

export function SimilarWorkoutModal({
  open,
  onClose,
  similarPresets,
  similarSaved,
  exerciseMap,
  currentSelectionId,
  fixedWorkoutIds,
  blockedWorkoutIds,
  onSelectPreset,
  onSelectSaved,
  onToggleWorkoutPin,
  onToggleWorkoutBlock,
}: Props) {
  if (!open) return null;

  const hasOptions = similarPresets.length > 0 || similarSaved.length > 0;

  return (
    <div className="game-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="similar-workout-title">
      <div className="game-modal game-modal--wide max-h-[85vh] overflow-y-auto">
        <button type="button" onClick={onClose} className="game-modal__close-btn" aria-label="Fechar">
          <X size={18} />
        </button>

        <h2 id="similar-workout-title" className="game-modal__title">
          Treinos similares
        </h2>
        <p className="game-modal__text">
          Opções que trabalham o mesmo foco muscular ou zonas muito parecidas. Use &quot;Sempre incluir&quot; para
          priorizar um treino nas recomendações.
        </p>

        {!hasOptions ? (
          <p className="mt-4 text-sm font-semibold text-stone-500">
            Nenhum treino similar disponível no momento.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {similarPresets.map((preset) => {
              const muscles = getPresetPrimaryMuscles(preset, exerciseMap);
              const isCurrent = preset.id === currentSelectionId;
              const isPinned = fixedWorkoutIds.includes(preset.id);
              const isBlocked = blockedWorkoutIds.includes(preset.id);

              return (
                <li key={preset.id} className="glass-card rounded-2xl p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[0.65rem] font-bold text-emerald-600">Ciclo {preset.ciclo_id}</p>
                      <p className="text-sm font-extrabold text-stone-900">
                        {preset.nome.split('—')[1]?.trim() ?? preset.nome}
                      </p>
                      <MuscleTagGroup muscles={muscles} className="mt-1.5" />
                      <p className="mt-1 text-[0.65rem] font-bold text-stone-500">
                        {preset.exercicios.length} exercícios
                      </p>
                    </div>
                    {!isCurrent && (
                      <GameButton size="sm" onClick={() => onSelectPreset(preset.id)}>
                        Usar
                      </GameButton>
                    )}
                    {isCurrent && (
                      <span className="rounded-lg bg-emerald-100 px-2 py-1 text-[0.65rem] font-extrabold text-emerald-800">
                        Atual
                      </span>
                    )}
                  </div>
                  <PreferenceToggleButtons
                    className="mt-2"
                    isPinned={isPinned}
                    isBlocked={isBlocked}
                    onTogglePin={() => onToggleWorkoutPin(preset.id)}
                    onToggleBlock={() => onToggleWorkoutBlock(preset.id)}
                    pinAriaLabel="Sempre recomendar este treino"
                    blockAriaLabel="Não recomendar este treino"
                    feedbackKind="workout"
                  />
                </li>
              );
            })}

            {similarSaved.map((saved) => {
              const muscles = getSavedWorkoutMuscles(saved);
              const isCurrent = currentSelectionId === toSavedPresetId(saved.id);

              return (
                <li key={saved.id} className="glass-card rounded-2xl p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[0.65rem] font-bold text-sky-600">Salvo</p>
                      <p className="text-sm font-extrabold text-stone-900">{saved.nome}</p>
                      <MuscleTagGroup muscles={muscles} className="mt-1.5" />
                      <p className="mt-1 text-[0.65rem] font-bold text-stone-500">{savedWorkoutSummary(saved)}</p>
                    </div>
                    {!isCurrent && (
                      <GameButton size="sm" onClick={() => onSelectSaved(saved.id)}>
                        Usar
                      </GameButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4">
          <GameButton variant="secondary" className="w-full" onClick={onClose}>
            Fechar
          </GameButton>
        </div>
      </div>
    </div>
  );
}
