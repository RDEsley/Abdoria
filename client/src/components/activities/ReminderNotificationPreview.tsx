import { useId, useState, type CSSProperties } from 'react';
import { Check, ChevronLeft, Volume2 } from 'lucide-react';
import { PERSONAL_NOTIFICATION_COLORS, PERSONAL_NOTIFICATION_ICONS } from '@shared/reminders';
import { Capacitor } from '@capacitor/core';
import { selectionHaptic } from '@/lib/platform/native-runtime';
import { PickerField } from '@/components/ui/PickerField';
import { REMINDER_ICON_COMPONENTS } from './reminder-icon-map';
import { ReminderSoundPicker } from './ReminderSoundPicker';
import type { RecurrenceDraft, ReminderDraftSlice } from './reminder-form-types';

type PreviewDraft = Pick<
  ReminderDraftSlice,
  'title' | 'message' | 'icon' | 'color' | 'recurrence' | 'times' | 'onceDate' | 'weekdays' | 'sound'
>;

interface ReminderNotificationPreviewProps {
  draft: PreviewDraft;
  onChange: (patch: Partial<ReminderDraftSlice>) => void;
  unlockedPacks: string[];
  titleInvalid?: boolean;
  errorId?: string;
}

type EditorView = 'main' | 'appearance' | 'repeat' | 'sound';

const DAYS = [
  { value: 0, label: 'D' },
  { value: 1, label: 'S' },
  { value: 2, label: 'T' },
  { value: 3, label: 'Q' },
  { value: 4, label: 'Q' },
  { value: 5, label: 'S' },
  { value: 6, label: 'S' },
] as const;

/**
 * Prévia editável — superfície principal do editor.
 * Ícone/cor = organização interna; Broto = identidade do SO.
 */
export function ReminderNotificationPreview({
  draft,
  onChange,
  unlockedPacks,
  titleInvalid,
  errorId,
}: ReminderNotificationPreviewProps) {
  const { title, message, icon, color, recurrence, times, onceDate, weekdays, sound } = draft;
  const [view, setView] = useState<EditorView>('main');
  const appearanceId = useId();
  const accent = PERSONAL_NOTIFICATION_COLORS.find((entry) => entry.id === color)?.hex ?? '#64748b';
  const BadgeIcon = REMINDER_ICON_COMPONENTS[icon];
  const native = Capacitor.isNativePlatform();

  const frequencyLabel =
    recurrence === 'once'
      ? 'Uma vez'
      : recurrence === 'daily'
        ? 'Todos os dias'
        : 'Dias específicos';

  const openView = (next: EditorView) => {
    void selectionHaptic();
    setView(next);
  };

  if (view === 'appearance') {
    return (
      <div className="reminder-editor-view" style={{ '--reminder-accent': accent } as CSSProperties}>
        <header className="reminder-editor-view__header">
          <button type="button" className="game-icon-btn" aria-label="Voltar" onClick={() => setView('main')}>
            <ChevronLeft size={18} aria-hidden />
          </button>
          <h3>Ícone e cor</h3>
        </header>
        <p className="reminder-editor-view__hint">Só para organizar dentro do Evolyn.</p>
        <div className="reminder-preview__icon-grid" role="group" aria-label="Ícone" id={appearanceId}>
          {PERSONAL_NOTIFICATION_ICONS.map((option) => {
            const Icon = REMINDER_ICON_COMPONENTS[option.id];
            return (
              <button
                key={option.id}
                type="button"
                title={option.label}
                aria-label={option.label}
                aria-pressed={icon === option.id}
                onClick={() => {
                  void selectionHaptic();
                  onChange({ icon: option.id });
                }}
              >
                <Icon size={16} aria-hidden />
              </button>
            );
          })}
        </div>
        <div className="reminder-preview__color-row" role="group" aria-label="Cor de organização">
          {PERSONAL_NOTIFICATION_COLORS.map((option) => (
            <button
              key={option.id}
              type="button"
              title={option.label}
              aria-label={option.label}
              aria-pressed={color === option.id}
              style={{ '--notification-color': option.hex } as CSSProperties}
              onClick={() => {
                void selectionHaptic();
                onChange({ color: option.id });
              }}
            >
              {color === option.id && <Check size={11} aria-hidden />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'repeat') {
    return (
      <div className="reminder-editor-view">
        <header className="reminder-editor-view__header">
          <button type="button" className="game-icon-btn" aria-label="Voltar" onClick={() => setView('main')}>
            <ChevronLeft size={18} aria-hidden />
          </button>
          <h3>Repetição</h3>
        </header>
        <div className="reminder-preview__repeat reminder-preview__repeat--panel">
          {(
            [
              ['daily', 'Todos os dias'],
              ['weekdays', 'Dias específicos'],
              ['once', 'Uma vez'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={recurrence === id}
              onClick={() => {
                void selectionHaptic();
                onChange({ recurrence: id as RecurrenceDraft });
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {recurrence === 'weekdays' && (
          <div className="personal-notification-form__days">
            {DAYS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={weekdays.includes(value)}
                onClick={() => {
                  void selectionHaptic();
                  onChange({
                    weekdays: weekdays.includes(value)
                      ? weekdays.filter((day) => day !== value)
                      : [...weekdays, value].sort(),
                  });
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {recurrence === 'once' && (
          <PickerField
            type="date"
            label="Data"
            emptyLabel="Selecionar data"
            value={onceDate}
            onChange={(event) => onChange({ onceDate: event.target.value })}
          />
        )}
      </div>
    );
  }

  if (view === 'sound') {
    return (
      <div className="reminder-editor-view">
        <header className="reminder-editor-view__header">
          <button type="button" className="game-icon-btn" aria-label="Voltar" onClick={() => setView('main')}>
            <ChevronLeft size={18} aria-hidden />
          </button>
          <h3>Som</h3>
        </header>
        {!native && (
          <p className="reminder-editor-view__hint">
            No navegador, o som da notificação pode ser controlado pelo sistema. Sons personalizados
            ficam disponíveis no app instalado.
          </p>
        )}
        <ReminderSoundPicker
          value={sound}
          unlockedPacks={unlockedPacks}
          onChange={(next) => onChange({ sound: next })}
          onClose={() => setView('main')}
        />
      </div>
    );
  }

  return (
    <div className="reminder-preview reminder-preview--surface" style={{ '--reminder-accent': accent } as CSSProperties}>
      <p className="reminder-preview__label">
        Prévia <span className="reminder-preview__label-hint">· toque para editar</span>
      </p>

      <div className="reminder-preview__body">
        <button
          type="button"
          className="reminder-preview__avatar reminder-preview__avatar--user"
          aria-label="Escolher ícone e cor de organização"
          onClick={() => openView('appearance')}
        >
          <BadgeIcon size={20} aria-hidden />
        </button>

        <div className="reminder-preview__copy">
          <div className="reminder-preview__title-row">
            <input
              type="text"
              className="reminder-preview__title-input"
              value={title}
              maxLength={60}
              placeholder="Seu lembrete"
              aria-label="Título do lembrete"
              aria-invalid={titleInvalid || undefined}
              aria-describedby={errorId}
              onChange={(event) => onChange({ title: event.target.value })}
            />
            <button
              type="button"
              className={`reminder-preview__sound-btn${sound !== 'app_default' ? ' is-custom' : ''}`}
              aria-label="Som do lembrete"
              onClick={() => openView('sound')}
            >
              <Volume2 size={16} aria-hidden />
            </button>
          </div>
          <textarea
            className="reminder-preview__message-input"
            value={message}
            maxLength={160}
            rows={2}
            placeholder="Uma mensagem curta aparece aqui."
            aria-label="Mensagem do lembrete (opcional)"
            onChange={(event) => onChange({ message: event.target.value })}
          />
          <div className="reminder-preview__meta-row">
            <button type="button" className="reminder-preview__freq" onClick={() => openView('repeat')}>
              {frequencyLabel}
            </button>
            <PickerField
              type="time"
              label=""
              emptyLabel="Horário"
              value={times[0] ?? ''}
              onChange={(event) => onChange({ times: [event.target.value, ...times.slice(1)] })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
