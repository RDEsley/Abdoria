import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Dumbbell, Info, Wind, X } from 'lucide-react';
import { ExerciseDemo } from '@/components/exercises/ExerciseDemo';
import { Modal } from '@/components/ui/Modal';
import type { IExerciseDocument } from '@/types';
import { MUSCULO_LABELS, formatExerciseName } from '@/types';

type GuideTab = 'animation' | 'muscles' | 'instructions';

interface Props {
  exercise: IExerciseDocument;
  open: boolean;
  onClose: () => void;
  prescriptionLabel?: string;
  sideLabel?: string | null;
}

const TAB_LABELS: Record<GuideTab, string> = {
  animation: 'Animação',
  muscles: 'Músculos',
  instructions: 'Como fazer',
};

export function ExerciseGuideSheet({
  exercise,
  open,
  onClose,
  prescriptionLabel,
  sideLabel,
}: Props) {
  const [mediaAvailable, setMediaAvailable] = useState(Boolean(exercise.media?.gif));
  const education = exercise.education;
  const name = formatExerciseName(exercise);
  const tips = education?.tips ?? [];
  const commonMistakes = education?.commonMistakes ?? [];
  const instructionSteps = useMemo(
    () => education?.steps?.filter(Boolean) ?? (exercise.descricao ? [exercise.descricao] : []),
    [education?.steps, exercise.descricao],
  );
  const tabs = useMemo<GuideTab[]>(() => {
    const available: GuideTab[] = [];
    if (mediaAvailable) available.push('animation');
    available.push('muscles');
    if (instructionSteps.length > 0) available.push('instructions');
    return available;
  }, [instructionSteps.length, mediaAvailable]);
  const [activeTab, setActiveTab] = useState<GuideTab>('animation');

  useEffect(() => {
    if (!open) return;
    setMediaAvailable(Boolean(exercise.media?.gif));
    setActiveTab(
      exercise.media?.gif ? 'animation' : instructionSteps.length ? 'instructions' : 'muscles',
    );
  }, [exercise.media?.gif, exercise.slug, instructionSteps.length, open]);

  useEffect(() => {
    if (!tabs.includes(activeTab)) setActiveTab(tabs[0] ?? 'muscles');
  }, [activeTab, tabs]);

  const handleAvailability = useCallback((available: boolean) => {
    setMediaAvailable(available);
  }, []);

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="bare"
      overlayClassName="exercise-guide-overlay"
      panelClassName="exercise-guide-sheet"
      labelledBy="exercise-guide-title"
      describedBy="exercise-guide-summary"
    >
      <div className="exercise-guide-sheet__header">
        <div className="min-w-0">
          <p className="exercise-guide-sheet__eyebrow">Guia do exercício</p>
          <h2 id="exercise-guide-title">{name}</h2>
          <p id="exercise-guide-summary">
            {education?.summary ??
              exercise.descricao ??
              'Confira o foco e a execução do movimento.'}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar guia do exercício">
          <X size={20} />
        </button>
      </div>

      {(prescriptionLabel || sideLabel) && (
        <div
          className="exercise-guide-sheet__prescription"
          role="note"
          aria-label="Prescrição atual"
        >
          <CheckCircle2 size={16} aria-hidden />
          <strong>{prescriptionLabel}</strong>
          {sideLabel && <span>{sideLabel}</span>}
        </div>
      )}

      {tabs.length > 1 && (
        <div className="exercise-guide-tabs" role="tablist" aria-label="Conteúdo do guia">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`exercise-guide-panel-${tab}`}
              className={activeTab === tab ? 'is-active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      )}

      <div
        className="exercise-guide-sheet__body"
        role="region"
        tabIndex={0}
        aria-label="Conteúdo do guia do exercício"
      >
        {activeTab === 'animation' && mediaAvailable && (
          <section id="exercise-guide-panel-animation" role="tabpanel">
            <ExerciseDemo
              name={name}
              mediaFile={exercise.media?.gif}
              className="exercise-guide-demo"
              onAvailabilityChange={handleAvailability}
            />
            <p className="exercise-guide-sheet__media-hint">
              Observe a posição inicial, a amplitude e o retorno controlado.
            </p>
          </section>
        )}

        {activeTab === 'muscles' && (
          <section
            id="exercise-guide-panel-muscles"
            role="tabpanel"
            className="exercise-guide-muscles"
          >
            <div className="exercise-guide-focus-card exercise-guide-focus-card--primary">
              <span>
                <Activity size={19} aria-hidden />
              </span>
              <div>
                <small>Foco principal</small>
                <strong>
                  {education?.primaryMuscles?.join(' · ') ??
                    MUSCULO_LABELS[exercise.musculo_principal]}
                </strong>
              </div>
            </div>
            {Boolean(
              education?.secondaryMuscles?.length || exercise.musculos_secundarios?.length,
            ) && (
              <div className="exercise-guide-focus-card">
                <span>
                  <Dumbbell size={19} aria-hidden />
                </span>
                <div>
                  <small>Trabalha também</small>
                  <strong>
                    {education?.secondaryMuscles?.join(' · ') ??
                      exercise.musculos_secundarios
                        ?.map((muscle) => MUSCULO_LABELS[muscle])
                        .join(' · ')}
                  </strong>
                </div>
              </div>
            )}
            <p className="exercise-guide-note">
              O foco indica onde você deve perceber maior esforço, sem substituir uma avaliação
              profissional.
            </p>
          </section>
        )}

        {activeTab === 'instructions' && instructionSteps.length > 0 && (
          <section
            id="exercise-guide-panel-instructions"
            role="tabpanel"
            className="exercise-guide-instructions"
          >
            <ol>
              {instructionSteps.map((step, index) => (
                <li key={`${exercise.slug}-step-${index}`}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>

            {education?.breathing && (
              <div className="exercise-guide-callout exercise-guide-callout--breathing">
                <Wind size={18} aria-hidden />
                <div>
                  <strong>Respiração</strong>
                  <p>{education.breathing}</p>
                </div>
              </div>
            )}
            {tips.length > 0 && (
              <div className="exercise-guide-callout">
                <Info size={18} aria-hidden />
                <div>
                  <strong>Dica</strong>
                  <p>{tips.join(' ')}</p>
                </div>
              </div>
            )}
            {commonMistakes.length > 0 && (
              <div className="exercise-guide-mistakes">
                <strong>Evite</strong>
                <ul>
                  {commonMistakes.map((mistake) => (
                    <li key={mistake}>{mistake}</li>
                  ))}
                </ul>
              </div>
            )}
            {education?.safety && <p className="exercise-guide-safety">{education.safety}</p>}
          </section>
        )}
      </div>

      <div className="exercise-guide-sheet__footer">
        <button type="button" onClick={onClose}>
          Voltar ao treino
        </button>
      </div>
    </Modal>
  );
}
