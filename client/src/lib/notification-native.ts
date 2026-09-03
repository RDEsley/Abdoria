import { Capacitor } from '@capacitor/core';
import {
  getNativeNotificationSoundBinding,
  getNotificationSound,
  resolveNotificationSound,
  type PersonalNotificationSound,
} from '@shared/notification-catalog';

export interface AndroidChannelSpec {
  id: string;
  name: string;
  description: string;
  importance: 2 | 3 | 4 | 5;
  vibration: boolean;
  sound?: string;
}

export function buildAndroidChannelSpec(
  soundId: PersonalNotificationSound,
  occurrenceKey: string,
): AndroidChannelSpec {
  const resolved = resolveNotificationSound(soundId, occurrenceKey);
  const definition = getNotificationSound(resolved.id);
  const binding = getNativeNotificationSoundBinding(soundId, occurrenceKey);

  const spec: AndroidChannelSpec = {
    id: binding.channelId,
    name: definition.label,
    description: `Alertas com som ${definition.label}`,
    importance: binding.silent ? 2 : 3,
    vibration: !binding.silent,
  };

  if (binding.silent) {
    spec.sound = undefined;
  } else if (binding.sound === 'default') {
    spec.sound = 'default';
  } else if (binding.sound) {
    spec.sound = binding.sound;
  }

  return spec;
}

export function resolveNativeLargeIconPath(icon: string): string {
  if (Capacitor.getPlatform() === 'android') {
    return `file:///android_asset/public/media/notifications/icons/${icon}-192.png`;
  }
  return `/media/notifications/icons/${icon}-192.png`;
}

export async function ensureAndroidNotificationChannels(
  specs: AndroidChannelSpec[],
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const seen = new Set<string>();
  for (const spec of specs) {
    if (seen.has(spec.id)) continue;
    seen.add(spec.id);
    await LocalNotifications.createChannel({
      id: spec.id,
      name: spec.name,
      description: spec.description,
      importance: spec.importance,
      vibration: spec.vibration,
      sound: spec.sound,
    });
  }
}

export function resolveIosNotificationSound(
  soundId: PersonalNotificationSound,
  occurrenceKey: string,
): string | undefined {
  const binding = getNativeNotificationSoundBinding(soundId, occurrenceKey);
  if (binding.silent) return undefined;
  if (binding.sound === 'default') return 'default';
  if (binding.sound) return `${binding.sound}.wav`;
  return undefined;
}

export function shouldShowNativeSoundHint(): boolean {
  return !Capacitor.isNativePlatform();
}
