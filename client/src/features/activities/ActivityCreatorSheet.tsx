import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { PickerField } from '@/components/ui/PickerField';
import {
  ACTIVITY_TEMPLATES,
  ACTIVITY_CATEGORIES,
  matchActivityTemplate,
  type ActivityCategory,
  type ActivitySchedule,
} from '@shared/activities';

const STEPS = ['Nome', 'Modelo', 'Quando', 'Confirmar'] as const;
const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
const WEEKDAYS = [
  { value: 0, label: 'D' },
  { value: 1, label: 'S' },
  { value: 2, label: 'T' },
  { value: 3, label: 'Q' },
  { value: 4, label: 'Q' },
  { value: 5, label: 'S' },
  { value: 6, label: 'S' },
] as const;

export function ActivityCreatorSheet({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (body: Record<string, unknown>) => Promise<unknown>;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [suggestedId, setSuggestedId] = useState<string | null>(null);
  const [suggestionConfidence, setSuggestionConfidence] = useState<'strong' | 'similar' | null>(
    null,
  );
  const [category, setCategory] = useState<ActivityCategory>('mente');
  const [days, setDays] = useState<number[]>([]);
  const [flexible, setFlexible] = useState(false);
  const [time, setTime] = useState('');
  const [remind, setRemind] = useState(false);
  const [busy, setBusy] = useState(false);

  const template = useMemo(
    () => ACTIVITY_TEMPLATES.find((item) => item.id === templateId) ?? null,
    [templateId],
  );
  const displayName = name.trim() || template?.name || 'Nova atividade';

  const scheduleSummary = (() => {
    if (flexible || days.length === 0) return 'Quando eu quiser';
    if (days.length === 7) return 'Todos os dias';
    return days.map((day) => WEEKDAY_LABELS[day] ?? '?').join(', ');
  })();

  const canNotify = Boolean(time) && !flexible && days.length > 0;

  const reset = () => {
    setStep(0);
    setName('');
    setTemplateId(null);
    setSuggestedId(null);
    setSuggestionConfidence(null);
    setCategory('mente');
    setDays([]);
    setFlexible(false);
    setTime('');
    setRemind(false);
  };

  const goToTemplateStep = () => {
    const match = matchActivityTemplate(name);
    if (match.confidence === 'strong' && match.template) {
      setSuggestedId(match.template.id);
      setSuggestionConfidence('strong');
      setTemplateId(match.template.id);
      setCategory(match.template.category);
    } else if (match.confidence === 'similar' && match.template) {
      setSuggestedId(match.template.id);
      setSuggestionConfidence('similar');
      setTemplateId((current) => current ?? match.template!.id);
      setCategory(match.template.category);
    } else {
      setSuggestedId(null);
      setSuggestionConfidence(null);
      setTemplateId(null);
      setCategory('outro');
    }
    setStep(1);
  };

  const toggleDay = (value: number) => {
    setFlexible(false);
    setDays((current) =>
      current.includes(value)
        ? current.filter((day) => day !== value)
        : [...current, value].sort((a, b) => a - b),
    );
  };

  const chooseFlexible = () => {
    setFlexible(true);
    setDays([]);
    setRemind(false);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const scheduled = !flexible && days.length > 0;
      const kind: ActivitySchedule['kind'] = !scheduled
        ? 'unscheduled'
        : days.length === 7
          ? 'daily'
          : 'weekdays';
      await onCreate({
        name: name.trim() || template?.name || 'Atividade',
        category: template?.category ?? category,
        template_id: template?.id ?? null,
        icon: template?.icon ?? 'star',
        color: template?.color ?? 'emerald',
        metric_kind: template?.metric_kind ?? 'none',
        metric_unit: template?.metric_unit ?? null,
        goal_value: template?.goal_value ?? null,
        schedule: {
          kind,
          times: time ? [time] : [],
          weekdays: kind === 'weekdays' ? days : [],
        },
        reminder: { enabled: remind && scheduled && Boolean(time), offset_min: 0, follow_up: false },
      });
      reset();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="activity-creator-title">
      <div className="p-4">
        <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-stone-400">
          {STEPS[step]}
        </p>
        <h2 id="activity-creator-title" className="game-section-title">
          {step >= 1 && name.trim() ? displayName : 'Nova atividade'}
        </h2>
        {step === 2 && <p className="mt-1 text-sm font-semibold text-stone-500">Quando você quer fazer?</p>}
        {step === 1 && suggestionConfidence === 'similar' && suggestedId && (
          <p className="mt-1 text-sm font-semibold text-emerald-700">
            Modelo recomendado pelo Evolyn — você pode trocar.
          </p>
        )}

        {step === 0 && (
          <input
            className="game-input mt-2 w-full"
            maxLength={40}
            placeholder="Ex.: Leitura da noite"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}

        {step === 1 && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_CATEGORIES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`game-tab${category === entry.id ? ' game-tab--active' : ''}`}
                  onClick={() => setCategory(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            {ACTIVITY_TEMPLATES.filter((item) => item.category === category).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`activity-template${templateId === item.id ? ' activity-template--on' : ''}${suggestedId === item.id ? ' activity-template--suggested' : ''}`}
                onClick={() => setTemplateId(item.id)}
              >
                {suggestedId === item.id && (
                  <small className="activity-template__hint">
                    {suggestionConfidence === 'strong' ? 'Selecionado pelo Evolyn' : 'Sugestão Evolyn'}
                  </small>
                )}
                <strong>{item.name}</strong>
                <small>{item.description}</small>
              </button>
            ))}
            {category === 'outro' && (
              <button
                type="button"
                className={`activity-template${!templateId ? ' activity-template--on' : ''}`}
                onClick={() => setTemplateId(null)}
              >
                <strong>Livre</strong>
                <small>Mantém o nome digitado e escolhe ícone/cor depois.</small>
              </button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex justify-between gap-1" aria-label="Dias da semana">
              {WEEKDAYS.map((day, index) => (
                <button
                  key={`${day.value}-${index}`}
                  type="button"
                  className={`activity-day-chip${days.includes(day.value) && !flexible ? ' is-on' : ''}`}
                  aria-pressed={days.includes(day.value) && !flexible}
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`activity-template${flexible || days.length === 0 ? ' activity-template--on' : ''}`}
              onClick={chooseFlexible}
            >
              Quando eu quiser
            </button>
            <PickerField
              type="time"
              label="Horário opcional"
              emptyLabel="Selecionar horário"
              value={time}
              hint={
                flexible || days.length === 0
                  ? 'Sem dias definidos este horário fica só como preferência — não gera lembrete automático.'
                  : undefined
              }
              onChange={(event) => setTime(event.target.value)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="activity-creator-summary mt-3">
            <p className="activity-creator-summary__title">{displayName}</p>
            <ul className="activity-creator-summary__list">
              <li>
                <span>Quando</span>
                <strong>{scheduleSummary}</strong>
              </li>
              <li>
                <span>Horário</span>
                <strong>{time || 'Sem horário fixo'}</strong>
              </li>
              {template ? (
                <li>
                  <span>Modelo</span>
                  <strong>{template.name}</strong>
                </li>
              ) : null}
            </ul>
            <label className="mt-3 flex items-center gap-2 text-sm font-bold text-stone-700">
              <input
                type="checkbox"
                checked={remind}
                onChange={(event) => setRemind(event.target.checked)}
                disabled={!canNotify}
              />
              Notificar neste horário
            </label>
            {!canNotify && (
              <p className="mt-1 text-xs font-semibold text-stone-500">
                Defina dias e horário na etapa anterior para ativar a notificação.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {step > 0 && (
            <GameButton variant="secondary" onClick={() => setStep((value) => value - 1)}>
              Voltar
            </GameButton>
          )}
          {step < STEPS.length - 1 ? (
            <GameButton
              className="flex-1"
              onClick={() => (step === 0 ? goToTemplateStep() : setStep((value) => value + 1))}
            >
              Continuar
            </GameButton>
          ) : (
            <GameButton className="flex-1" disabled={busy} onClick={() => void submit()}>
              {busy ? 'Salvando…' : 'Criar'}
            </GameButton>
          )}
        </div>
      </div>
    </Modal>
  );
}
