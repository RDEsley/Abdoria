import { useId, useState, type CSSProperties } from 'react';
import { Check, Volume2 } from 'lucide-react';
import { PERSONAL_NOTIFICATION_COLORS, PERSONAL_NOTIFICATION_ICONS } from '@shared/reminders';
import { reminderSoundLabel } from '@shared/reminder-sounds';
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
 * Prévia interativa — o editor principal. Ícone e cor são organização interna;
 * o Broto identifica a notificação real no sistema operacional.
 */
export function ReminderNotificationPreview({
  draft,
  onChange,
  unlockedPacks,
  titleInvalid,
  errorId,
}: ReminderNotificationPreviewProps) {
  const { title, message, icon, color, recurrence, times, onceDate, weekdays, sound } = draft;
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
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

  return (
    <div className="reminder-preview" style={{ '--reminder-accent': accent } as CSSProperties}>
      <p className="reminder-preview__label">
        Prévia <span className="reminder-preview__label-hint">· toque para editar</span>
      </p>

      <div className="reminder-preview__card">
        <button
          type="button"
          className="reminder-preview__avatar reminder-preview__avatar--user"
          aria-haspopup="true"
          aria-expanded={appearanceOpen}
          aria-controls={appearanceId}
          aria-label="Escolher ícone e cor de organização"
          onClick={() => {
            void selectionHaptic();
            setAppearanceOpen((value) => !value);
            setSoundOpen(false);
            setRepeatOpen(false);
          }}
        >
          <BadgeIcon size={22} aria-hidden />
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
              className="reminder-preview__sound-btn"
              aria-label="Som do lembrete"
              aria-expanded={soundOpen}
              onClick={() => {
                void selectionHaptic();
                setSoundOpen((value) => !value);
                setAppearanceOpen(false);
                setRepeatOpen(false);
              }}
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
            <button
              type="button"
              className="reminder-preview__freq"
              aria-expanded={repeatOpen}
              onClick={() => {
                void selectionHaptic();
                setRepeatOpen((value) => !value);
                setAppearanceOpen(false);
                setSoundOpen(false);
              }}
            >
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
          <p className="reminder-preview__sound-chip">
            {sound === 'silent' ? '🔇' : sound === 'random' ? '🔀' : '🔊'} {reminderSoundLabel(sound)}
          </p>
        </div>
      </div>

      {repeatOpen && (
        <div className="reminder-preview__repeat">
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
      )}

      {soundOpen && (
        <ReminderSoundPicker
          value={sound}
          unlockedPacks={unlockedPacks}
          onChange={(next) => onChange({ sound: next })}
          onClose={() => setSoundOpen(false)}
        />
      )}

      {appearanceOpen && (
        <div className="reminder-preview__appearance" id={appearanceId}>
          <div className="reminder-preview__icon-grid" role="group" aria-label="Ícone">
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
      )}

      <p className="reminder-preview__os-note">
        No celular, o Broto Assistente identifica as notificações do Evolyn.
        {!native &&
          ' Sons personalizados estão disponíveis no aplicativo instalado. No navegador, o som pode ser controlado pelo sistema.'}
      </p>
    </div>
  );
}
