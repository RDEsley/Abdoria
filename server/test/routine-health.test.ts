import { describe, expect, it } from 'vitest';
import {
  filterAvailableRoutineItems,
  isRoutineFullyRunnable,
  resolveRoutineHealth,
  routineHasAvailableItems,
} from '../../shared/activities/routine-health.js';

function item(activityId: string, position = 0) {
  return {
    routine_id: 'r1',
    activity_id: activityId,
    position,
    scheduled_time: null as string | null,
    reminder_enabled: false,
  };
}

describe('resolveRoutineHealth', () => {
  it('healthy: todas as Activities disponíveis', () => {
    const health = resolveRoutineHealth(
      { items: [item('a1'), item('a2', 1)] },
      new Set(['a1', 'a2', 'a3']),
    );
    expect(health.state).toBe('healthy');
    expect(health.totalItems).toBe(2);
    expect(health.availableItems).toBe(2);
    expect(health.unavailableItems).toBe(0);
    expect(isRoutineFullyRunnable(health)).toBe(true);
    expect(routineHasAvailableItems(health)).toBe(true);
  });

  it('degraded: uma de três arquivada', () => {
    const health = resolveRoutineHealth(
      { items: [item('a1'), item('a2', 1), item('a3', 2)] },
      new Set(['a1', 'a3']),
    );
    expect(health.state).toBe('degraded');
    expect(health.availableItems).toBe(2);
    expect(health.unavailableItems).toBe(1);
    expect(health.unavailableActivityIds).toEqual(['a2']);
    expect(isRoutineFullyRunnable(health)).toBe(false);
    expect(routineHasAvailableItems(health)).toBe(true);
  });

  it('empty: todas arquivadas', () => {
    const health = resolveRoutineHealth(
      { items: [item('gone'), item('also-gone', 1)] },
      new Set(['alive']),
    );
    expect(health.state).toBe('empty');
    expect(health.availableItems).toBe(0);
    expect(health.unavailableItems).toBe(2);
    expect(isRoutineFullyRunnable(health)).toBe(false);
    expect(routineHasAvailableItems(health)).toBe(false);
  });

  it('empty: rotina sem items', () => {
    const health = resolveRoutineHealth({ items: [] }, new Set(['a1']));
    expect(health.state).toBe('empty');
    expect(health.totalItems).toBe(0);
  });

  it('filterAvailableRoutineItems descarta IDs mortos', () => {
    const items = [item('a1'), item('dead', 1), item('a2', 2)];
    expect(filterAvailableRoutineItems(items, new Set(['a1', 'a2'])).map((i) => i.activity_id)).toEqual([
      'a1',
      'a2',
    ]);
  });
});
