import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import {
  NOTIFICATION_SOUND_CATEGORIES,
  listNotificationSoundsByCategory,
  type NotificationSoundCategory,
  type PersonalNotificationSound,
} from '@shared/notification-catalog';
import {
  getPlayingNotificationSoundId,
  stopNotificationSoundPreview,
  subscribeNotificationSoundPreview,
  toggleNotificationSoundPreview,
} from '@/lib/notification-sound-preview';
import { selectionHaptic } from '@/lib/platform/native-runtime';

interface ReminderSoundPickerProps {
  value: PersonalNotificationSound;
  onChange: (sound: PersonalNotificationSound) => void;
}

export function ReminderSoundPicker({ value, onChange }: ReminderSoundPickerProps) {
  const [category, setCategory] = useState<NotificationSoundCategory>('evolyn');
  const [playingId, setPlayingId] = useState(getPlayingNotificationSoundId());
  const isWeb = !Capacitor.isNativePlatform();

  useEffect(() => subscribeNotificationSoundPreview(setPlayingId), []);
  useEffect(() => () => stopNotificationSoundPreview(), []);

  const sounds = listNotificationSoundsByCategory(category);

  return (
    <div className="reminder-sound-picker">
      {isWeb && (
        <p className="reminder-sound-picker__hint">
          Os sons personalizados completos estão disponíveis no aplicativo instalado.
        </p>
      )}

      <div className="reminder-sound-picker__tabs" role="tablist" aria-label="Categorias de som">
        {NOTIFICATION_SOUND_CATEGORIES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={category === entry.id}
            className={category === entry.id ? 'is-active' : undefined}
            onClick={() => {
              void selectionHaptic();
              setCategory(entry.id);
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="reminder-sound-picker__list" role="tabpanel">
        {sounds.map((sound) => {
          const selected = value === sound.id;
          const isPlaying = playingId === sound.id;

          return (
            <div
              key={sound.id}
              className={`reminder-sound-picker__item${selected ? ' is-selected' : ''}${
                isPlaying ? ' is-playing' : ''
              }`}
            >
              <button
                type="button"
                className="reminder-sound-picker__select"
                aria-pressed={selected}
                onClick={() => {
                  void selectionHaptic();
                  onChange(sound.id);
                }}
              >
                <span className="reminder-sound-picker__label">{sound.label}</span>
                {sound.id === 'random' && (
                  <small>Um som da coleção por horário (fixo até editar)</small>
                )}
                {sound.nativeCustomSound && isWeb && <small>Preview aqui · entrega no app</small>}
              </button>
              <button
                type="button"
                className="reminder-sound-picker__play"
                aria-label={isPlaying ? `Parar ${sound.label}` : `Ouvir ${sound.label}`}
                disabled={sound.id === 'silent' || sound.id === 'system_default'}
                onClick={() => {
                  void selectionHaptic();
                  if (!selected) onChange(sound.id);
                  void toggleNotificationSoundPreview(sound.id);
                }}
              >
                {isPlaying ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
                {isPlaying && (
                  <span className="reminder-sound-picker__eq" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {value === 'random' && (
        <p className="reminder-sound-picker__random-note">
          Cada horário recebe um som elegível de forma estável. No app nativo isso vale até você
          editar o lembrete; na web o preview funciona aqui, mas a notificação usa o som do sistema.
        </p>
      )}
    </div>
  );
}
