import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  REMINDER_SOUND_PACK_IDS,
  reminderSoundAndroidStem,
  reminderSoundChannelId,
  type ReminderSoundId,
} from '@shared/reminder-sounds';

const DEFAULT_CHANNEL_ID = 'evolyn_reminders_v1';

interface EvolynNotificationsPlugin {
  openChannelSettings(options: { channelId: string }): Promise<void>;
}

const EvolynNotifications = registerPlugin<EvolynNotificationsPlugin>('EvolynNotifications');

export interface AndroidChannelSpec {
  id: string;
  name: string;
  description: string;
  importance: 2 | 3 | 4;
  vibration: boolean;
  sound?: string;
  visibility?: 0 | 1;
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

function channelSpecForSound(sound: ReminderSoundId): AndroidChannelSpec {
  if (sound === 'silent') {
    return {
      id: reminderSoundChannelId('silent'),
      name: 'Lembretes silenciosos',
      description: 'Lembretes sem som',
      importance: 2,
      vibration: false,
      sound: 'evolyn_silent',
    };
  }
  const stem = reminderSoundAndroidStem(sound);
  const id = reminderSoundChannelId(sound === 'random' ? 'app_default' : sound);
  if (!stem || sound === 'app_default' || sound === 'random') {
    return getDefaultAndroidChannel();
  }
  return {
    id,
    name: `Lembrete · ${sound.replace(/^som_/, '')}`,
    description: 'Canal estável deste som. O Android pode substituir o áudio nas configurações.',
    importance: 4,
    vibration: true,
    sound: stem,
  };
}

let channelsEnsured = false;

export async function ensureAndroidNotificationChannels(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const specs = [
    getDefaultAndroidChannel(),
    channelSpecForSound('silent'),
    ...REMINDER_SOUND_PACK_IDS.map((id) => channelSpecForSound(id)),
  ];
  for (const channel of specs) {
    await LocalNotifications.createChannel({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      importance: channel.importance,
      vibration: channel.vibration,
      sound: channel.sound,
      visibility: 1,
    });
  }
  channelsEnsured = true;
}

export function androidChannelIdForSound(sound: ReminderSoundId): string {
  return channelSpecForSound(sound).id;
}

export interface AndroidChannelOverride {
  channelId: string;
  blocked: boolean;
  customized: boolean;
}

/** Indício de que o usuário (ou o OEM) mudou o canal depois que o app o criou. */
export async function inspectAndroidReminderChannel(
  channelId: string,
  expectedSound?: string,
): Promise<AndroidChannelOverride | null> {
  if (Capacitor.getPlatform() !== 'android') return null;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  if (!channelsEnsured) await ensureAndroidNotificationChannels();
  try {
    const { channels } = await LocalNotifications.listChannels();
    const channel = channels.find((entry) => entry.id === channelId);
    if (!channel) return null;
    const blocked = channel.importance === 0 || channel.importance === 1;
    const customized = Boolean(
      expectedSound && channel.sound && channel.sound !== expectedSound && channel.sound !== '',
    );
    if (!blocked && !customized) return null;
    return { channelId, blocked, customized };
  } catch {
    return null;
  }
}

export async function openAndroidChannelSettings(channelId: string): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') return false;
  try {
    await EvolynNotifications.openChannelSettings({ channelId });
    return true;
  } catch {
    return false;
  }
}
