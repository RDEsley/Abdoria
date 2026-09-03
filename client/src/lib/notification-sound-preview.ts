import {
  getNotificationSound,
  type NotificationSoundId,
  type PersonalNotificationSound,
} from '@shared/notification-catalog';

let currentAudio: HTMLAudioElement | null = null;
let playingId: NotificationSoundId | null = null;
const listeners = new Set<(id: NotificationSoundId | null) => void>();

function notify() {
  for (const listener of listeners) listener(playingId);
}

export function subscribeNotificationSoundPreview(
  listener: (id: NotificationSoundId | null) => void,
): () => void {
  listeners.add(listener);
  listener(playingId);
  return () => listeners.delete(listener);
}

export function getPlayingNotificationSoundId(): NotificationSoundId | null {
  return playingId;
}

export function stopNotificationSoundPreview(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.onended = null;
    currentAudio = null;
  }
  playingId = null;
  notify();
}

export async function toggleNotificationSoundPreview(
  soundId: PersonalNotificationSound,
): Promise<NotificationSoundId | null> {
  if (soundId === 'silent') {
    stopNotificationSoundPreview();
    return null;
  }

  if (soundId === 'random') {
    stopNotificationSoundPreview();
    const pool = getNotificationSound('random');
    void pool;
    const { RANDOM_SOUND_POOL } = await import('@shared/notification-catalog');
    const pick = RANDOM_SOUND_POOL[Math.floor(Math.random() * RANDOM_SOUND_POOL.length)];
    return toggleNotificationSoundPreview(pick);
  }

  const definition = getNotificationSound(soundId);
  if (!definition.previewPath) {
    stopNotificationSoundPreview();
    return null;
  }

  if (playingId === soundId && currentAudio) {
    stopNotificationSoundPreview();
    return null;
  }

  stopNotificationSoundPreview();
  const audio = new Audio(definition.previewPath);
  currentAudio = audio;
  playingId = soundId;
  notify();

  audio.onended = () => {
    if (playingId === soundId) {
      playingId = null;
      currentAudio = null;
      notify();
    }
  };

  try {
    await audio.play();
  } catch {
    stopNotificationSoundPreview();
    return null;
  }

  return soundId;
}
