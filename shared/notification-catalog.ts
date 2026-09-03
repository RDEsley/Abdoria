/**
 * Fonte de verdade para sons e aparência de notificações personalizadas.
 * Usado por client, server e testes — evite mappings duplicados.
 */

export type NotificationSoundCategory =
  'evolyn' | 'minimal' | 'nature' | 'melody' | 'playful' | 'system';

export type NotificationSoundId =
  | 'system_default'
  | 'silent'
  | 'random'
  | 'evolyn_leaf'
  | 'evolyn_sprout'
  | 'evolyn_xp'
  | 'evolyn_achievement'
  | 'evolyn_evolve'
  | 'evolyn_golden_leaf'
  | 'minimal_ping'
  | 'minimal_pop'
  | 'minimal_chime'
  | 'minimal_bell'
  | 'minimal_soft'
  | 'minimal_pulse'
  | 'nature_leaves'
  | 'nature_water'
  | 'nature_wind'
  | 'nature_drop'
  | 'nature_forest'
  | 'melody_calm'
  | 'melody_rise'
  | 'melody_spark'
  | 'playful_sparkle'
  | 'playful_bounce';

/** Valor persistido em `PersonalizedReminder.sound`. */
export type PersonalNotificationSound = NotificationSoundId;

export type PersonalNotificationIcon =
  'neutral' | 'water' | 'leaf' | 'workout' | 'study' | 'health' | 'alarm' | 'heart' | 'star';

export interface NotificationSoundDefinition {
  id: NotificationSoundId;
  label: string;
  category: NotificationSoundCategory;
  /** Caminho público para preview Web (mesmo arquivo usado no nativo). */
  previewPath: string | null;
  /** Nome do arquivo nativo sem extensão (res/raw no Android, bundle no iOS). */
  nativeBaseName: string | null;
  /** Canal Android versionado — imutável após criação. */
  androidChannelId: string | null;
  durationMs: number;
  /** Som customizado só em app nativo; Web Push usa som do SO. */
  nativeCustomSound: boolean;
}

export const NOTIFICATION_SOUND_CATALOG: readonly NotificationSoundDefinition[] = [
  {
    id: 'system_default',
    label: 'Padrão do sistema',
    category: 'system',
    previewPath: null,
    nativeBaseName: null,
    androidChannelId: 'evolyn_snd_system_default_v1',
    durationMs: 0,
    nativeCustomSound: false,
  },
  {
    id: 'silent',
    label: 'Silencioso',
    category: 'system',
    previewPath: null,
    nativeBaseName: null,
    androidChannelId: 'evolyn_snd_silent_v1',
    durationMs: 0,
    nativeCustomSound: false,
  },
  {
    id: 'random',
    label: 'Aleatório',
    category: 'system',
    previewPath: null,
    nativeBaseName: null,
    androidChannelId: null,
    durationMs: 0,
    nativeCustomSound: false,
  },
  {
    id: 'evolyn_leaf',
    label: 'Folha',
    category: 'evolyn',
    previewPath: '/media/notifications/sounds/evolyn_leaf.wav',
    nativeBaseName: 'evolyn_leaf',
    androidChannelId: 'evolyn_snd_evolyn_leaf_v1',
    durationMs: 900,
    nativeCustomSound: true,
  },
  {
    id: 'evolyn_sprout',
    label: 'Germinar',
    category: 'evolyn',
    previewPath: '/media/notifications/sounds/evolyn_sprout.wav',
    nativeBaseName: 'evolyn_sprout',
    androidChannelId: 'evolyn_snd_evolyn_sprout_v1',
    durationMs: 1100,
    nativeCustomSound: true,
  },
  {
    id: 'evolyn_xp',
    label: 'XP',
    category: 'evolyn',
    previewPath: '/media/notifications/sounds/evolyn_xp.wav',
    nativeBaseName: 'evolyn_xp',
    androidChannelId: 'evolyn_snd_evolyn_xp_v1',
    durationMs: 700,
    nativeCustomSound: true,
  },
  {
    id: 'evolyn_achievement',
    label: 'Conquista',
    category: 'evolyn',
    previewPath: '/media/notifications/sounds/evolyn_achievement.wav',
    nativeBaseName: 'evolyn_achievement',
    androidChannelId: 'evolyn_snd_evolyn_achievement_v1',
    durationMs: 1400,
    nativeCustomSound: true,
  },
  {
    id: 'evolyn_evolve',
    label: 'Evolução',
    category: 'evolyn',
    previewPath: '/media/notifications/sounds/evolyn_evolve.wav',
    nativeBaseName: 'evolyn_evolve',
    androidChannelId: 'evolyn_snd_evolyn_evolve_v1',
    durationMs: 1500,
    nativeCustomSound: true,
  },
  {
    id: 'evolyn_golden_leaf',
    label: 'Folha dourada',
    category: 'evolyn',
    previewPath: '/media/notifications/sounds/evolyn_golden_leaf.wav',
    nativeBaseName: 'evolyn_golden_leaf',
    androidChannelId: 'evolyn_snd_evolyn_golden_leaf_v1',
    durationMs: 1200,
    nativeCustomSound: true,
  },
  {
    id: 'minimal_ping',
    label: 'Ping',
    category: 'minimal',
    previewPath: '/media/notifications/sounds/minimal_ping.wav',
    nativeBaseName: 'minimal_ping',
    androidChannelId: 'evolyn_snd_minimal_ping_v1',
    durationMs: 350,
    nativeCustomSound: true,
  },
  {
    id: 'minimal_pop',
    label: 'Pop',
    category: 'minimal',
    previewPath: '/media/notifications/sounds/minimal_pop.wav',
    nativeBaseName: 'minimal_pop',
    androidChannelId: 'evolyn_snd_minimal_pop_v1',
    durationMs: 280,
    nativeCustomSound: true,
  },
  {
    id: 'minimal_chime',
    label: 'Chime',
    category: 'minimal',
    previewPath: '/media/notifications/sounds/minimal_chime.wav',
    nativeBaseName: 'minimal_chime',
    androidChannelId: 'evolyn_snd_minimal_chime_v1',
    durationMs: 800,
    nativeCustomSound: true,
  },
  {
    id: 'minimal_bell',
    label: 'Bell',
    category: 'minimal',
    previewPath: '/media/notifications/sounds/minimal_bell.wav',
    nativeBaseName: 'minimal_bell',
    androidChannelId: 'evolyn_snd_minimal_bell_v1',
    durationMs: 1000,
    nativeCustomSound: true,
  },
  {
    id: 'minimal_soft',
    label: 'Soft',
    category: 'minimal',
    previewPath: '/media/notifications/sounds/minimal_soft.wav',
    nativeBaseName: 'minimal_soft',
    androidChannelId: 'evolyn_snd_minimal_soft_v1',
    durationMs: 600,
    nativeCustomSound: true,
  },
  {
    id: 'minimal_pulse',
    label: 'Pulse',
    category: 'minimal',
    previewPath: '/media/notifications/sounds/minimal_pulse.wav',
    nativeBaseName: 'minimal_pulse',
    androidChannelId: 'evolyn_snd_minimal_pulse_v1',
    durationMs: 500,
    nativeCustomSound: true,
  },
  {
    id: 'nature_leaves',
    label: 'Folhas',
    category: 'nature',
    previewPath: '/media/notifications/sounds/nature_leaves.wav',
    nativeBaseName: 'nature_leaves',
    androidChannelId: 'evolyn_snd_nature_leaves_v1',
    durationMs: 1100,
    nativeCustomSound: true,
  },
  {
    id: 'nature_water',
    label: 'Água',
    category: 'nature',
    previewPath: '/media/notifications/sounds/nature_water.wav',
    nativeBaseName: 'nature_water',
    androidChannelId: 'evolyn_snd_nature_water_v1',
    durationMs: 900,
    nativeCustomSound: true,
  },
  {
    id: 'nature_wind',
    label: 'Vento',
    category: 'nature',
    previewPath: '/media/notifications/sounds/nature_wind.wav',
    nativeBaseName: 'nature_wind',
    androidChannelId: 'evolyn_snd_nature_wind_v1',
    durationMs: 1000,
    nativeCustomSound: true,
  },
  {
    id: 'nature_drop',
    label: 'Gota',
    category: 'nature',
    previewPath: '/media/notifications/sounds/nature_drop.wav',
    nativeBaseName: 'nature_drop',
    androidChannelId: 'evolyn_snd_nature_drop_v1',
    durationMs: 650,
    nativeCustomSound: true,
  },
  {
    id: 'nature_forest',
    label: 'Floresta',
    category: 'nature',
    previewPath: '/media/notifications/sounds/nature_forest.wav',
    nativeBaseName: 'nature_forest',
    androidChannelId: 'evolyn_snd_nature_forest_v1',
    durationMs: 1600,
    nativeCustomSound: true,
  },
  {
    id: 'melody_calm',
    label: 'Calma',
    category: 'melody',
    previewPath: '/media/notifications/sounds/melody_calm.wav',
    nativeBaseName: 'melody_calm',
    androidChannelId: 'evolyn_snd_melody_calm_v1',
    durationMs: 1800,
    nativeCustomSound: true,
  },
  {
    id: 'melody_rise',
    label: 'Ascensão',
    category: 'melody',
    previewPath: '/media/notifications/sounds/melody_rise.wav',
    nativeBaseName: 'melody_rise',
    androidChannelId: 'evolyn_snd_melody_rise_v1',
    durationMs: 1700,
    nativeCustomSound: true,
  },
  {
    id: 'melody_spark',
    label: 'Brilho',
    category: 'melody',
    previewPath: '/media/notifications/sounds/melody_spark.wav',
    nativeBaseName: 'melody_spark',
    androidChannelId: 'evolyn_snd_melody_spark_v1',
    durationMs: 1500,
    nativeCustomSound: true,
  },
  {
    id: 'playful_sparkle',
    label: 'Faísca',
    category: 'playful',
    previewPath: '/media/notifications/sounds/playful_sparkle.wav',
    nativeBaseName: 'playful_sparkle',
    androidChannelId: 'evolyn_snd_playful_sparkle_v1',
    durationMs: 800,
    nativeCustomSound: true,
  },
  {
    id: 'playful_bounce',
    label: 'Bounce',
    category: 'playful',
    previewPath: '/media/notifications/sounds/playful_bounce.wav',
    nativeBaseName: 'playful_bounce',
    androidChannelId: 'evolyn_snd_playful_bounce_v1',
    durationMs: 700,
    nativeCustomSound: true,
  },
] as const;

export const NOTIFICATION_SOUND_CATEGORIES: ReadonlyArray<{
  id: NotificationSoundCategory;
  label: string;
}> = [
  { id: 'system', label: 'Sistema' },
  { id: 'evolyn', label: 'Evolyn' },
  { id: 'minimal', label: 'Minimalistas' },
  { id: 'nature', label: 'Natureza' },
  { id: 'melody', label: 'Melodias' },
  { id: 'playful', label: 'Divertidos' },
] as const;

const SOUND_BY_ID = new Map(NOTIFICATION_SOUND_CATALOG.map((entry) => [entry.id, entry]));
const KNOWN_SOUND_IDS = new Set(NOTIFICATION_SOUND_CATALOG.map((entry) => entry.id));

/** Sons elegíveis para sorteio do modo aleatório. */
export const RANDOM_SOUND_POOL: readonly NotificationSoundId[] = NOTIFICATION_SOUND_CATALOG.filter(
  (entry) => entry.nativeCustomSound,
).map((entry) => entry.id);

const LEGACY_SOUND_MAP: Record<string, PersonalNotificationSound> = {
  default: 'system_default',
  soft: 'minimal_soft',
  nature: 'nature_leaves',
  motivational: 'melody_rise',
  silent: 'silent',
};

export function normalizeNotificationSound(raw: unknown): PersonalNotificationSound {
  if (typeof raw === 'string' && KNOWN_SOUND_IDS.has(raw as NotificationSoundId)) {
    return raw as PersonalNotificationSound;
  }
  if (typeof raw === 'string' && raw in LEGACY_SOUND_MAP) {
    return LEGACY_SOUND_MAP[raw];
  }
  return 'system_default';
}

export function getNotificationSound(id: PersonalNotificationSound): NotificationSoundDefinition {
  return SOUND_BY_ID.get(id) ?? SOUND_BY_ID.get('system_default')!;
}

export function listNotificationSoundsByCategory(
  category: NotificationSoundCategory,
): NotificationSoundDefinition[] {
  return NOTIFICATION_SOUND_CATALOG.filter((entry) => entry.category === category);
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/**
 * Resolve `random` de forma determinística por lembrete + ocorrência.
 * Garante o mesmo som entre re-syncs nativos e reenvios do dispatcher.
 */
export function resolveNotificationSound(
  sound: PersonalNotificationSound,
  seed: string,
): NotificationSoundDefinition {
  if (sound !== 'random') return getNotificationSound(sound);
  const pool = RANDOM_SOUND_POOL;
  if (pool.length === 0) return getNotificationSound('system_default');
  const pick = pool[hashSeed(seed) % pool.length];
  return getNotificationSound(pick);
}

export function getNotificationIconUrl(
  icon: PersonalNotificationIcon,
  size: 96 | 192 = 192,
): string {
  return `/media/notifications/icons/${icon}-${size}.png`;
}

export const NOTIFICATION_ICON_FALLBACK = '/brand/favicon-192.png';

export function resolveNotificationIconUrl(icon: PersonalNotificationIcon): string {
  return getNotificationIconUrl(icon, 192);
}

export function resolveNotificationBadgeUrl(icon: PersonalNotificationIcon): string {
  return getNotificationIconUrl(icon, 96);
}

export interface NativeNotificationSoundBinding {
  channelId: string;
  sound: string | undefined;
  silent: boolean;
}

/** Mapeia som resolvido para canal Android / arquivo iOS. */
export function getNativeNotificationSoundBinding(
  sound: PersonalNotificationSound,
  occurrenceKey: string,
): NativeNotificationSoundBinding {
  const resolved = resolveNotificationSound(sound, occurrenceKey);
  if (resolved.id === 'silent') {
    return { channelId: resolved.androidChannelId!, sound: undefined, silent: true };
  }
  if (!resolved.nativeCustomSound) {
    return { channelId: resolved.androidChannelId!, sound: 'default', silent: false };
  }
  return {
    channelId: resolved.androidChannelId!,
    sound: resolved.nativeBaseName ?? undefined,
    silent: false,
  };
}

export interface WebPushNotificationPayload {
  title: string;
  body: string;
  tag: string;
  icon: string;
  badge: string;
  silent: boolean;
}

export function buildWebPushNotificationPayload(
  reminder: {
    id: string;
    title: string;
    message: string;
    icon: PersonalNotificationIcon;
    sound: PersonalNotificationSound;
  },
  occurrenceKey: string,
): WebPushNotificationPayload {
  const resolved = resolveNotificationSound(reminder.sound, `${reminder.id}:${occurrenceKey}`);
  return {
    title: reminder.title,
    body: reminder.message || 'Hora do seu lembrete no Evolyn.',
    tag: reminder.id,
    icon: resolveNotificationIconUrl(reminder.icon),
    badge: resolveNotificationBadgeUrl(reminder.icon),
    silent: resolved.id === 'silent',
  };
}
