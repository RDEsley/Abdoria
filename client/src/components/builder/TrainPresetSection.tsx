import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { Check, Play, Sparkles } from 'lucide-react';
import { MuscleTagGroup } from '@/components/builder/MuscleTag';
import { getPresetPrimaryMuscles } from '@/components/builder/builder-muscles';
import { presetSummary } from '@/components/builder/queue-utils';
import { PreferenceToggleButtons } from '@/components/library/PreferenceToggleButtons';
import type {
  IExerciseDocument,
  IWorkoutPresetDocument,
  SavedWorkoutPreset,
  TreinoBase,
  TreinoSugerido,
} from '@/types';
import { CICLO_LABELS } from '@/types';

interface Props {
  cicloTreinos: TreinoBase[];
  rodadaDone: Partial<Record<TreinoBase, boolean>>;
  suggestedWorkout: TreinoSugerido | null;
  suggestedPresetId: string | null;
  selectedPresetId: string | 'custom';
  selectedPreset?: IWorkoutPresetDocument;
  selectedSavedWorkout?: SavedWorkoutPreset;
  exerciseMap: Map<string, IExerciseDocument>;
  fixedWorkoutIds: string[];
  blockedWorkoutIds: string[];
  onSelectCiclo: (ciclo: TreinoBase) => void;
  onSelectPreset: (id: string) => void;
  onSwapWorkout: () => void;
  onToggleWorkoutPin: (presetId: string) => void;
  onToggleWorkoutBlock: (presetId: string) => void;
}

/** Aba Treinar: progresso dos ciclos, banner do recomendado e card do treino selecionado. */
export function TrainPresetSection({
  cicloTreinos,
  rodadaDone,
  suggestedWorkout,
  suggestedPresetId,
  selectedPresetId,
  selectedPreset,
  selectedSavedWorkout,
  exerciseMap,
  fixedWorkoutIds,
  blockedWorkoutIds,
  onSelectCiclo,
  onSelectPreset,
  onSwapWorkout,
  onToggleWorkoutPin,
  onToggleWorkoutBlock,
}: Props) {
  return (
    <section id="builder-presets">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles size={18} className="text-amber-500" />
        <div>
          <h3 className="game-section-title !mb-0">Treino do dia</h3>
          <div
            className="game-builder-cycle-progress mt-1"
            role="tablist"
            aria-label="Ciclos de treino"
          >
            {cicloTreinos.map((c, i) => {
              const done = !!rodadaDone[c];
              const isSuggested = suggestedWorkout?.ciclo_id === c;
              const isActive = selectedPreset?.ciclo_id === c;
              return (
                <Fragment key={c}>
                  {i > 0 && (
                    <span className="game-builder-cycle-progress__arrow" aria-hidden>
                      →
                    </span>
                  )}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={[
                      'game-builder-cycle-chip',
                      done ? 'game-builder-cycle-chip--done' : '',
                      isActive ? 'game-builder-cycle-chip--active' : '',
                      !isActive && isSuggested ? 'game-builder-cycle-chip--next' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => onSelectCiclo(c)}
                    title={`Ciclo ${c} — ${CICLO_LABELS[c]}`}
                  >
                    {done && <Check size={10} strokeWidth={3} aria-hidden />}
                    Ciclo {c}
                  </button>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {suggestedWorkout && suggestedPresetId && selectedPresetId !== suggestedPresetId && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="game-builder-next-banner mb-3"
        >
          <span className="game-builder-next-banner__icon" aria-hidden>
            <Play size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="game-builder-next-banner__label">Recomendado agora</p>
            <p className="game-builder-next-banner__title">
              Ciclo {suggestedWorkout.ciclo_id} —{' '}
              {suggestedWorkout.nome.split('—')[1]?.trim() ?? suggestedWorkout.nome}
            </p>
          </div>
          <button
            type="button"
            className="game-builder-next-banner__action"
            onClick={() => onSelectPreset(suggestedPresetId)}
          >
            Usar
          </button>
        </motion.div>
      )}

      {(selectedPreset || selectedSavedWorkout) && (
        <div className="glass-card p-4">
          {selectedPreset && (
            <>
              <p className="text-[0.65rem] font-bold text-emerald-600">
                Ciclo {selectedPreset.ciclo_id}
              </p>
              <p className="text-sm font-extrabold text-stone-900">
                {selectedPreset.nome.split('—')[1]?.trim() ?? selectedPreset.nome}
              </p>
              <MuscleTagGroup
                muscles={getPresetPrimaryMuscles(selectedPreset, exerciseMap)}
                className="mt-2"
              />
              <p className="mt-2 text-xs font-bold text-stone-600">{selectedPreset.descricao}</p>
              <p className="mt-1 text-[0.65rem] font-bold text-stone-500">
                {presetSummary(selectedPreset)}
              </p>
              <PreferenceToggleButtons
                className="mt-3"
                onSwapWorkout={onSwapWorkout}
                swapAriaLabel="Trocar treino similar"
                isPinned={fixedWorkoutIds.includes(selectedPreset.id)}
                isBlocked={blockedWorkoutIds.includes(selectedPreset.id)}
                onTogglePin={() => onToggleWorkoutPin(selectedPreset.id)}
                onToggleBlock={() => onToggleWorkoutBlock(selectedPreset.id)}
                pinAriaLabel="Sempre recomendar este treino"
                blockAriaLabel="Não recomendar este treino"
                feedbackKind="workout"
              />
            </>
          )}
          {selectedSavedWorkout && (
            <>
              <p className="text-[0.65rem] font-bold text-sky-600">Treino salvo</p>
              <p className="text-sm font-extrabold text-stone-900">{selectedSavedWorkout.nome}</p>
              <p className="mt-2 text-xs font-bold text-stone-600">
                {selectedSavedWorkout.queue.length} exercícios personalizados.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
