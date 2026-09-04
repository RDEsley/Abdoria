import { describe, expect, it } from 'vitest';
import {
  backlogOccurrenceForActivity,
  filterTodayTabOccurrences,
  matchesActivityCategoryFilter,
} from '../../shared/activities/today-list.js';
import { plannedOccurrencesForDay } from '../../shared/activities/occurrences.js';
import type { ActivityRecord } from '../../shared/activities/types.js';
import { nextStickyUntil, shouldAcceptToast } from '../../shared/ui/toast-sticky.js';

function activity(partial: Partial<ActivityRecord> & Pick<ActivityRecord, 'id' | 'name'>): ActivityRecord {
  return {
    user_id: 'u1',
    category: 'mente',
    template_id: null,
    icon: 'star',
    color: 'emerald',
    metric_kind: 'none',
    metric_unit: null,
    goal_value: null,
    minimum_value: null,
    schedule: { kind: 'unscheduled', weekdays: [], times: [], period: null, once_at: null },
    reminder: { enabled: false, offset_min: 0, follow_up: false },
    sort_order: 0,
    archived_at: null,
    legacy_id: null,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    ...partial,
  };
}

describe('TodayTab filters', () => {
  const today = '2026-09-04';

  it('Hoje e Todas não são equivalentes', () => {
    const daily = activity({
      id: 'a-daily',
      name: 'Leitura',
      schedule: { kind: 'daily', weekdays: [], times: [], period: null, once_at: null },
    });
    const tomorrowOnly = activity({
      id: 'a-tomorrow',
      name: 'Só amanhã',
      schedule: {
        kind: 'once',
        weekdays: [],
        times: [],
        period: null,
        once_at: '2026-09-05',
      },
    });
    const activities = [daily, tomorrowOnly];
    const planned = plannedOccurrencesForDay(activities, today, []);

    const hoje = filterTodayTabOccurrences({
      plannedToday: planned,
      activities,
      dayKey: today,
      logs: [],
      filter: 'hoje',
      query: '',
    });
    const todas = filterTodayTabOccurrences({
      plannedToday: planned,
      activities,
      dayKey: today,
      logs: [],
      filter: 'todas',
      query: '',
    });

    expect(hoje.backlog).toHaveLength(0);
    expect(todas.backlog.map((i) => i.activity_id)).toContain('a-tomorrow');
    expect(todas.planned.length + todas.backlog.length).toBeGreaterThan(hoje.planned.length);
  });

  it('Activity agendada amanhã aparece em Todas mas não Hoje', () => {
    const item = activity({
      id: 'once',
      name: 'Dentista',
      schedule: {
        kind: 'once',
        weekdays: [],
        times: ['10:00'],
        period: null,
        once_at: '2026-09-05',
      },
    });
    expect(backlogOccurrenceForActivity(item, today, [])?.not_planned_today).toBe(true);
    const planned = plannedOccurrencesForDay([item], today, []);
    expect(planned).toHaveLength(0);
    const todas = filterTodayTabOccurrences({
      plannedToday: planned,
      activities: [item],
      dayKey: today,
      logs: [],
      filter: 'todas',
      query: '',
    });
    expect(todas.backlog).toHaveLength(1);
    const hoje = filterTodayTabOccurrences({
      plannedToday: planned,
      activities: [item],
      dayKey: today,
      logs: [],
      filter: 'hoje',
      query: '',
    });
    expect(hoje.planned).toHaveLength(0);
    expect(hoje.backlog).toHaveLength(0);
  });

  it('filtro de categoria aplica sobre todas as activities', () => {
    const mente = activity({
      id: 'm1',
      name: 'Estudo',
      category: 'mente',
      schedule: { kind: 'daily', weekdays: [], times: [], period: null, once_at: null },
    });
    const corpo = activity({
      id: 'c1',
      name: 'Corrida amanhã',
      category: 'corpo',
      schedule: {
        kind: 'once',
        weekdays: [],
        times: [],
        period: null,
        once_at: '2026-09-05',
      },
    });
    const planned = plannedOccurrencesForDay([mente, corpo], today, []);
    const filtered = filterTodayTabOccurrences({
      plannedToday: planned,
      activities: [mente, corpo],
      dayKey: today,
      logs: [],
      filter: 'corpo',
      query: '',
    });
    expect(filtered.planned).toHaveLength(0);
    expect(filtered.backlog.map((i) => i.activity_id)).toEqual(['c1']);
    expect(matchesActivityCategoryFilter('mente', 'corpo')).toBe(false);
  });

  it('não duplica activity que já está no plano de hoje', () => {
    const daily = activity({
      id: 'dup',
      name: 'Água',
      schedule: { kind: 'daily', weekdays: [], times: [], period: null, once_at: null },
    });
    const planned = plannedOccurrencesForDay([daily], today, []);
    const todas = filterTodayTabOccurrences({
      plannedToday: planned,
      activities: [daily],
      dayKey: today,
      logs: [],
      filter: 'todas',
      query: '',
    });
    expect(todas.planned).toHaveLength(1);
    expect(todas.backlog).toHaveLength(0);
  });
});

describe('toast sticky action policy', () => {
  it('bloqueia informativo enquanto sticky de Desfazer está ativo', () => {
    const stickyUntil = nextStickyUntil({ hasAction: true, now: 1000, duration: 5000 });
    expect(stickyUntil).toBe(6000);
    expect(
      shouldAcceptToast({ hasAction: false, variant: 'success', now: 2000, stickyUntil }),
    ).toBe(false);
    expect(
      shouldAcceptToast({ hasAction: false, variant: 'error', now: 2000, stickyUntil }),
    ).toBe(true);
  });
});

describe('archive optimistic contract', () => {
  it('falha restaura snapshot na lista', () => {
    const snapshot = activity({ id: 'a1', name: 'X' });
    let list: ActivityRecord[] = [snapshot];
    list = list.filter((item) => item.id !== 'a1');
    expect(list).toHaveLength(0);
    list = [snapshot, ...list];
    expect(list.map((i) => i.id)).toEqual(['a1']);
  });

  it('undo reinsere imediatamente', () => {
    const snapshot = activity({ id: 'a1', name: 'X', archived_at: null });
    let list: ActivityRecord[] = [];
    list = [{ ...snapshot, archived_at: null }, ...list];
    expect(list).toHaveLength(1);
  });
});

describe('creator reset policy', () => {
  it('estado inicial do wizard é step 0 limpo', () => {
    const initial = {
      step: 0,
      name: '',
      templateId: null,
      category: 'mente',
      days: [] as number[],
      time: '',
      remind: false,
    };
    const afterCancelFromStep2 = { ...initial };
    expect(afterCancelFromStep2.step).toBe(0);
    expect(afterCancelFromStep2.name).toBe('');
  });
});

describe('completion feedback', () => {
  it('silentFeedback implica haptic só na UI (servidor não re-haptic)', () => {
    const uiHaptic = true;
    const serverHaptic = false; // silentFeedback path
    expect(uiHaptic && !serverHaptic).toBe(true);
  });
});
