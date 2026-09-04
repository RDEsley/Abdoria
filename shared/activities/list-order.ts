import type { ActivityRecord } from './types.js';

/** Reinsere Activity preservando ordem por sort_order (desempate por created_at/id). */
export function insertActivityBySortOrder(
  list: ActivityRecord[],
  item: ActivityRecord,
): ActivityRecord[] {
  const without = list.filter((entry) => entry.id !== item.id);
  const next = [...without, item];
  next.sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    const byCreated = a.created_at.localeCompare(b.created_at);
    if (byCreated !== 0) return byCreated;
    return a.id.localeCompare(b.id);
  });
  return next;
}
