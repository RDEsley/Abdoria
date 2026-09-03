import { ROUTINE_ITEMS_MAX, type RoutineItemRecord } from './types.js';

export interface RoutineItemInput {
  activity_id: string;
  scheduled_time: string | null;
  reminder_enabled: boolean;
}

export function isTimeString(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Normaliza a lista de itens recebida na criação/edição de uma rotina.
 * Aceita tanto o formato legado (`string[]` de activity_id) quanto objetos
 * ricos `{ activity_id, scheduled_time?, reminder_enabled? }`, sem quebrar
 * chamadores existentes.
 */
export function normalizeRoutineItems(raw: unknown): RoutineItemInput[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: RoutineItemInput[] = [];
  for (const entry of raw) {
    let activityId = '';
    let scheduledTime: string | null = null;
    let reminderEnabled = false;
    if (typeof entry === 'string') {
      activityId = entry;
    } else if (isRecord(entry)) {
      activityId = typeof entry.activity_id === 'string' ? entry.activity_id : '';
      scheduledTime = isTimeString(entry.scheduled_time) ? entry.scheduled_time : null;
      reminderEnabled = entry.reminder_enabled === true && scheduledTime != null;
    }
    activityId = activityId.trim();
    if (!activityId || seen.has(activityId)) continue;
    seen.add(activityId);
    result.push({
      activity_id: activityId,
      scheduled_time: scheduledTime,
      reminder_enabled: reminderEnabled,
    });
    if (result.length >= ROUTINE_ITEMS_MAX) break;
  }
  return result;
}
export function routineItemInputToRecord(
  routineId: string,
  input: RoutineItemInput,
  position: number,
): Pick<
  RoutineItemRecord,
  'routine_id' | 'activity_id' | 'position' | 'scheduled_time' | 'reminder_enabled'
> {
  return {
    routine_id: routineId,
    activity_id: input.activity_id,
    position,
    scheduled_time: input.scheduled_time,
    reminder_enabled: input.reminder_enabled,
  };
}
