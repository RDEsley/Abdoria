import type { RoutineItemRecord } from './types.js';

export type RoutineHealthState = 'healthy' | 'degraded' | 'empty';

export interface RoutineHealth {
  state: RoutineHealthState;
  totalItems: number;
  availableItems: number;
  unavailableItems: number;
  availableActivityIds: string[];
  unavailableActivityIds: string[];
}

/** Estado derivado: Activity arquivada/removida vs items da rotina. Não persiste. */
export function resolveRoutineHealth(
  routine: { items?: RoutineItemRecord[] | null },
  availableActivityIds: ReadonlySet<string> | Iterable<string>,
): RoutineHealth {
  const live =
    availableActivityIds instanceof Set
      ? availableActivityIds
      : new Set(availableActivityIds);
  const items = routine.items ?? [];
  const availableActivityIdsList: string[] = [];
  const unavailableActivityIds: string[] = [];

  for (const item of items) {
    if (live.has(item.activity_id)) availableActivityIdsList.push(item.activity_id);
    else unavailableActivityIds.push(item.activity_id);
  }

  const availableItems = availableActivityIdsList.length;
  const unavailableItems = unavailableActivityIds.length;
  const state: RoutineHealthState =
    availableItems === 0 ? 'empty' : unavailableItems > 0 ? 'degraded' : 'healthy';

  return {
    state,
    totalItems: items.length,
    availableItems,
    unavailableItems,
    availableActivityIds: availableActivityIdsList,
    unavailableActivityIds,
  };
}

/** Rotina pode ser executada sem reparo (todas as Activities existem). */
export function isRoutineFullyRunnable(health: Pick<RoutineHealth, 'state'>): boolean {
  return health.state === 'healthy';
}

/** Rotina ainda tem pelo menos uma Activity viva (útil para hasRoutines / listagens). */
export function routineHasAvailableItems(health: Pick<RoutineHealth, 'availableItems'>): boolean {
  return health.availableItems > 0;
}

/** Items vivos para progresso/guide — descarta IDs arquivados. */
export function filterAvailableRoutineItems<T extends RoutineItemRecord>(
  items: T[] | null | undefined,
  availableActivityIds: ReadonlySet<string>,
): T[] {
  return (items ?? []).filter((item) => availableActivityIds.has(item.activity_id));
}
