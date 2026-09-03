import { COSMETICS } from './cosmetics.js';

/** Sons de notificação nativa — reutilizam os pacotes de SFX do Evolyn. */
export const REMINDER_SOUND_PACK_IDS = COSMETICS.filter((item) => item.kind === 'som').map(
  (item) => item.id,
);

export const REMINDER_SOUND_SPECIAL_IDS = ['app_default', 'silent', 'random'] as const;

export type ReminderSoundSpecialId = (typeof REMINDER_SOUND_SPECIAL_IDS)[number];
export type ReminderSoundPackId = (typeof REMINDER_SOUND_PACK_IDS)[number];
export type ReminderSoundId = ReminderSoundSpecialId | ReminderSoundPackId;

export const DEFAULT_REMINDER_SOUND: ReminderSoundId = 'app_default';

const SPECIAL = new Set<string>(REMINDER_SOUND_SPECIAL_IDS);
const PACKS = new Set<string>(REMINDER_SOUND_PACK_IDS);

export function isReminderSoundId(value: unknown): value is ReminderSoundId {
  return typeof value === 'string' && (SPECIAL.has(value) || PACKS.has(value));
}

export function normalizeReminderSound(value: unknown): ReminderSoundId {
  if (isReminderSoundId(value)) return value;
  return DEFAULT_REMINDER_SOUND;
}

export function reminderSoundAndroidStem(sound: ReminderSoundId): string | null {
  if (sound === 'app_default' || sound === 'random') return null;
  if (sound === 'silent') return 'evolyn_silent';
  return `evolyn_${sound.replace(/^som_/, '')}`;
}

export function reminderSoundChannelId(sound: ReminderSoundId): string {
  if (sound === 'app_default') return 'evolyn_reminders_v1';
  if (sound === 'silent') return 'evolyn_reminder_silent_v1';
  const stem = reminderSoundAndroidStem(sound) ?? 'evolyn_classico';
  return `${stem.replace(/^evolyn_/, 'evolyn_reminder_')}_v1`;
}

export function reminderSoundIosFile(sound: ReminderSoundId): string | undefined {
  if (sound === 'app_default' || sound === 'random') return undefined;
  if (sound === 'silent') return 'evolyn_silent.wav';
  const stem = reminderSoundAndroidStem(sound);
  return stem ? `${stem}.wav` : undefined;
}

export function reminderSoundLabel(sound: ReminderSoundId): string {
  if (sound === 'app_default') return 'Padrão Evolyn';
  if (sound === 'silent') return 'Silencioso';
  if (sound === 'random') return 'Aleatório';
  const item = COSMETICS.find((entry) => entry.id === sound);
  return item?.nome ?? sound;
}

/**
 * Random estável por ocorrência: mesmo reminder + slot → mesmo som no resync.
 * Prefere o pack do catálogo apontado pelo hash quando desbloqueado; senão
 * cai no conjunto desbloqueado ordenado (nunca muda só porque houve resync).
 */
export function resolveReminderSoundForOccurrence(
  sound: ReminderSoundId,
  reminderId: string,
  occurrenceKey: string,
  unlockedPacks: readonly string[],
): ReminderSoundId {
  if (sound !== 'random') {
    if (sound === 'app_default' || sound === 'silent') return sound;
    return unlockedPacks.includes(sound) ? sound : DEFAULT_REMINDER_SOUND;
  }

  const unlocked = REMINDER_SOUND_PACK_IDS.filter((id) => unlockedPacks.includes(id));
  if (unlocked.length === 0) return DEFAULT_REMINDER_SOUND;

  let hash = 2166136261;
  for (const character of `${reminderId}:${occurrenceKey}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const preferred = REMINDER_SOUND_PACK_IDS[Math.abs(hash) % REMINDER_SOUND_PACK_IDS.length];
  if (unlocked.includes(preferred)) return preferred;
  return unlocked[Math.abs(hash) % unlocked.length];
}

export function listUnlockedReminderPacks(desbloqueados: readonly string[] | undefined): string[] {
  const unlocked = new Set(desbloqueados ?? []);
  return REMINDER_SOUND_PACK_IDS.filter((id) => {
    const item = COSMETICS.find((entry) => entry.id === id);
    if (!item) return false;
    if (item.unlock.tipo === 'gratis') return true;
    return unlocked.has(id);
  });
}
