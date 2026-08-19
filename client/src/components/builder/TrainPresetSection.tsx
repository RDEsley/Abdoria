import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { Check, Play, Swords, X } from 'lucide-react';
import { MuscleTagGroup } from '@/components/builder/MuscleTag';
import { getPresetPrimaryMuscles } from '@/components/builder/builder-muscles';
import { presetSummary } from '@/components/builder/queue-utils';
import { GameButton } from '@/components/ui/GameButton';
import type {
  IExerciseDocument,
  IWorkoutPresetDocument,
  PlanoDia,
  SavedWorkoutPreset,
  TreinoBase,
  TreinoSugerido,
} from '@/types';
import { CICLO_LABELS, PARTE_CORPO_LABELS } from '@/types';

/** Dados do plano corpo-todo — quando presente, os chips viram Missões 1..N. */
export interface PlanSectionData {
  dias: PlanoDia[];
  completados: number[];
  selecionadoIndice: number | null;
  sugeridoIndice: number | null;
  onSelectDia: (indice: number) => void;
}

interface Props {
  cicloTreinos: TreinoBase[];
  rodadaDone: Partial<Record<TreinoBase, boolean>>;
  suggestedWorkout: TreinoSugerido | null;
  suggestedPresetId: string | null;
  selectedPresetId: string | 'custom';
  selectedPreset?: IWorkoutPresetDocument;
  selectedSavedWorkout?: SavedWorkoutPreset;
  selectedPlanWorkout?: TreinoSugerido | null;
  plan?: PlanSectionData | null;
  exerciseMap: Map<string, IExerciseDocument>;
  dismissedCardKeys: Set<string>;
  onSelectCiclo: (ciclo: TreinoBase) => void;
  onSelectPreset: (id: string) => void;
  onSwapWorkout: () => void;
  onDismissCard: (key: string) => void;
}

/** Aba Treinar: progresso dos ciclos/missões, banner do recomendado e card do selecionado. */
export function TrainPresetSection({
  cicloTreinos,
  rodadaDone,
  suggestedWorkout,
  suggestedPresetId,
  selectedPresetId,
  selectedPreset,
  selectedSavedWorkout,
  selectedPlanWorkout,
  plan,
  exerciseMap,
  dismissedCardKeys,
  onSelectCiclo,
  onSelectPreset,
  onSwapWorkout,
  onDismissCard,
}: Props) {
  const selectedCardKey = selectedPreset
    ? `ciclo-${selectedPreset.ciclo_id}`
    : selectedPlanWorkout?.plano_dia_indice != null
      ? `dia-${selectedPlanWorkout.plano_dia_indice}`
      : selectedSavedWorkout
        ? `salvo-${selectedSavedWorkout.id}`
        : null;
  const showSelectedCard = selectedCardKey ? !dismissedCardKeys.has(selectedCardKey) : false;

  return (
    <section id="builder-presets">
      <div className="game-train-head mb-3">
        <span className="game-train-head__icon" aria-hidden>
          <Swords size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div
            className="game-builder-cycle-progress"
            role="tablist"
            aria-label={plan ? 'Missões do plano' : 'Ciclos de treino'}
          >
            {plan
              ? plan.dias.map((dia, i) => {
                  const done = plan.completados.includes(dia.indice);
                  const isSuggested = plan.sugeridoIndice === dia.indice;
                  const isActive = plan.selecionadoIndice === dia.indice;
                  return (
                    <Fragment key={dia.indice}>
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
                        onClick={() => plan.onSelectDia(dia.indice)}
                        title={dia.titulo}
                      >
                        {done && <Check size={10} strokeWidth={3} aria-hidden />}
                        Dia {dia.indice + 1}
                      </button>
                    </Fragment>
                  );
                })
              : cicloTreinos.map((c, i) => {
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
              {suggestedWorkout.ciclo_id
                ? `Ciclo ${suggestedWorkout.ciclo_id} — ${
                    suggestedWorkout.nome.split('—')[1]?.trim() ?? suggestedWorkout.nome
                  }`
                : suggestedWorkout.nome}
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

      {(selectedPreset || selectedSavedWorkout || selectedPlanWorkout) && showSelectedCard && (
        <div className="glass-card game-cycle-card p-4">
          {selectedPreset && (
            <>
              <div className="game-cycle-card__header">
                <span className="game-cycle-card__badge">
                  <Swords size={11} aria-hidden /> Ciclo {selectedPreset.ciclo_id}
                </span>
                <button
                  type="button"
                  className="game-cycle-card__remove"
                  aria-label="Fechar sugestão deste ciclo"
                  title="Fechar sugestão"
                  onClick={() => selectedCardKey && onDismissCard(selectedCardKey)}
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
              <p className="game-cycle-card__title">
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
              <GameButton
                variant="secondary"
                size="sm"
                className="mt-3 w-full"
                onClick={onSwapWorkout}
              >
                Trocar por treino similar
              </GameButton>
            </>
          )}
          {!selectedPreset && selectedPlanWorkout && (
            <>
              <div className="game-cycle-card__header">
                <span className="game-cycle-card__badge">
                  <Swords size={11} aria-hidden />{' '}
                  {selectedPlanWorkout.plano_titulo ?? 'Plano de treino'}
                </span>
              </div>
              <p className="game-cycle-card__title">
                {selectedPlanWorkout.nome.split('—')[1]?.trim() ?? selectedPlanWorkout.nome}
              </p>
              {plan && plan.selecionadoIndice != null && (
                <p className="mt-2 text-xs font-bold text-stone-600">
                  {plan.dias
                    .find((d) => d.indice === plan.selecionadoIndice)
                    ?.grupos.map((g) => PARTE_CORPO_LABELS[g])
                    .join(' · ')}
                </p>
              )}
              <p className="mt-1 text-[0.65rem] font-bold text-stone-500">
                {selectedPlanWorkout.descricao} · {selectedPlanWorkout.total_exercicios} exercícios
              </p>
              <div className="game-exercise-actions mt-3">
                <GameButton
                  variant="secondary"
                  size="sm"
                  className="game-exercise-actions__swap"
                  onClick={onSwapWorkout}
                >
                  Sortear outra variação
                </GameButton>
              </div>
            </>
          )}
          {selectedSavedWorkout && (
            <>
              <div className="game-cycle-card__header">
                <span className="game-cycle-card__badge game-cycle-card__badge--saved">
                  Treino salvo
                </span>
              </div>
              <p className="game-cycle-card__title">{selectedSavedWorkout.nome}</p>
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
