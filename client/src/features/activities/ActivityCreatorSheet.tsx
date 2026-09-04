import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { PickerField } from '@/components/ui/PickerField';
import {
  reminderPermissionHint,
  useEnsureReminderPermission,
} from '@/hooks/useEnsureReminderPermission';
import {
  ACTIVITY_CATEGORIES,
  activityCreateTemplates,
  suggestActivityTemplates,
  templatesByCategoryForCreate,
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
  const [suggestedIds, setSuggestedIds] = useState<string[]>([]);
  const [suggestionConfidence, setSuggestionConfidence] = useState<'strong' | 'similar' | null>(
    null,
  );
  const [category, setCategory] = useState<ActivityCategory>('mente');
  const [days, setDays] = useState<number[]>([]);
  const [flexible, setFlexible] = useState(false);
  const [time, setTime] = useState('');
  const [remind, setRemind] = useState(false);
  const [busy, setBusy] = useState(false);
  const { permission, capability, canDeliverReminders, ensureCanEnableReminder } =
    useEnsureReminderPermission();
  const reminderHint = reminderPermissionHint(
    capability === 'opt_out' ? 'opt_out' : permission,
    canDeliverReminders,
  );

  const liveSuggestions = useMemo(
    () => (step === 0 || step === 1 ? suggestActivityTemplates(name, 3) : []),
    [name, step],
  );

  const template = useMemo(
    () => activityCreateTemplates().find((item) => item.id === templateId) ?? null,
    [templateId],
  );
  const displayName = name.trim() || template?.name || 'Nova atividade';
  const catalogForCategory = templatesByCategoryForCreate(category);

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
    setSuggestedIds([]);
    setSuggestionConfidence(null);
    setCategory('mente');
    setDays([]);
    setFlexible(false);
    setTime('');
    setRemind(false);
    setBusy(false);
  };

  // Fecha sem criar → próximo open começa limpo (não sobe ao trocar step).
  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const goToTemplateStep = () => {
    const suggestions = suggestActivityTemplates(name, 3);
    setSuggestedIds(suggestions.map((entry) => entry.template.id));
    const top = suggestions[0];
    if (top) {
      setSuggestionConfidence(top.confidence);
      // Pré-seleciona só como sugestão — o usuário confirma no passo Modelo.
      setTemplateId(top.template.id);
      setCategory(top.template.category);
    } else {
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

  const renderTemplateButton = (
    item: { id: string; name: string; description: string },
    opts?: { suggested?: boolean },
  ) => (
    <button
      key={item.id}
      type="button"
      className={`activity-template${templateId === item.id ? ' activity-template--on' : ''}${opts?.suggested ? ' activity-template--suggested' : ''}`}
      onClick={() => {
        setTemplateId(item.id);
        const found = activityCreateTemplates().find((entry) => entry.id === item.id);
        if (found) setCategory(found.category);
      }}
    >
      {opts?.suggested && (
        <small className="activity-template__hint">
          {suggestionConfidence === 'strong' ? 'Sugestão forte' : 'Sugestão Evolyn'}
        </small>
      )}
      <strong>{item.name}</strong>
      <small>{item.description}</small>
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} labelledBy="activity-creator-title" autoFocus={false}>
      <div className="p-4 activity-creator-sheet">
        <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-stone-400">
          {STEPS[step]}
        </p>
        <h2 id="activity-creator-title" className="game-section-title">
          {step >= 1 && name.trim() ? displayName : 'Nova atividade'}
        </h2>
        {step === 2 && (
          <p className="mt-1 text-sm font-semibold text-stone-500">Quando você quer fazer?</p>
        )}
        {step === 1 && suggestionConfidence && suggestedIds.length > 0 && (
          <p className="mt-1 text-sm font-semibold text-emerald-700">
            Até 3 sugestões pelo que você escreveu — toque para confirmar.
          </p>
        )}

        {step === 0 && (
          <>
            <input
              className="game-input mt-2 w-full"
              maxLength={40}
              placeholder="Ex.: estudar japonês"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {liveSuggestions.length > 0 && (
              <div className="activity-creator-suggestions mt-3">
                <p className="activity-creator-suggestions__label">Sugestões</p>
                {liveSuggestions.map((entry) =>
                  renderTemplateButton(entry.template, { suggested: true }),
                )}
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <div className="mt-2 flex flex-col gap-2">
            {suggestedIds.length > 0 && (
              <div className="activity-creator-suggestions">
                {activityCreateTemplates()
                  .filter((item) => suggestedIds.includes(item.id))
                  .sort(
                    (a, b) => suggestedIds.indexOf(a.id) - suggestedIds.indexOf(b.id),
                  )
                  .slice(0, 3)
                  .map((item) => renderTemplateButton(item, { suggested: true }))}
              </div>
            )}
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
            {catalogForCategory.map((item) =>
              suggestedIds.includes(item.id) ? null : renderTemplateButton(item),
            )}
            {category === 'outro' && (
              <button
                type="button"
                className={`activity-template${!templateId ? ' activity-template--on' : ''}`}
                onClick={() => setTemplateId(null)}
              >
                <strong>Livre</strong>
                <small>Mantém o nome digitado — ideal para práticas personalizadas.</small>
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
                onChange={(event) => {
                  const next = event.target.checked;
                  if (!next) {
                    setRemind(false);
                    return;
                  }
                  void ensureCanEnableReminder().then((ok) => {
                    if (ok) setRemind(true);
                  });
                }}
                disabled={!canNotify}
              />
              Notificar neste horário
            </label>
            {!canNotify ? (
              <p className="mt-1 text-xs font-semibold text-stone-500">
                Defina dias e horário na etapa anterior para ativar a notificação.
              </p>
            ) : reminderHint ? (
              <p className="mt-1 text-xs font-semibold text-amber-700">{reminderHint}</p>
            ) : null}
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
