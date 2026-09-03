import { Capacitor } from '@capacitor/core';

const DEFAULT_CHANNEL_ID = 'evolyn_reminders_v1';

export interface AndroidChannelSpec {
  id: string;
  name: string;
  description: string;
  importance: 3;
  vibration: boolean;
}

export function getDefaultAndroidChannel(): AndroidChannelSpec {
  return {
    id: DEFAULT_CHANNEL_ID,
    name: 'Lembretes Evolyn',
    description: 'Alertas de rotina e lembretes personalizados',
    importance: 3,
    vibration: true,
  };
}

export function getDefaultChannelId(): string {
  return DEFAULT_CHANNEL_ID;
}

export function resolveNativeLargeIconPath(): string {
  if (Capacitor.getPlatform() === 'android') {
    return 'file:///android_asset/public/media/notifications/icons/evolyn-192.png';
  }
  return '/media/notifications/icons/evolyn-192.png';
}

export async function ensureAndroidNotificationChannels(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const channel = getDefaultAndroidChannel();
  await LocalNotifications.createChannel({
    id: channel.id,
    name: channel.name,
    description: channel.description,
    importance: channel.importance,
    vibration: channel.vibration,
  });
}
