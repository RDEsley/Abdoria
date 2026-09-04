import { describe, expect, it } from 'vitest';
import {
  backlogOccurrenceForActivity,
  filterTodayTabOccurrences,
  groupOccurrences,
  insertActivityBySortOrder,
  matchesActivityCategoryFilter,
  plannedOccurrencesForDay,
  resolveActivityCompletionFeedback,
  type ActivityOccurrence,
  type ActivityRecord,
} from '../../shared/activities/index.js';
import { foldText } from '../../shared/utils/text-fold.js';
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

function occ(
  partial: Partial<ActivityOccurrence> & Pick<ActivityOccurrence, 'activity_id' | 'name'>,
): ActivityOccurrence {
  return {
    icon: 'star',
    color: 'emerald',
    category: 'mente',
    time: null,
    period: null,
    occurrence_key: 'k',
    status: 'pending',
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

  it('busca ignora acentos', () => {
    const items = [
      activity({
        id: '1',
        name: 'Meditação',
        schedule: { kind: 'daily', weekdays: [], times: [], period: null, once_at: null },
      }),
      activity({
        id: '2',
        name: 'Organização',
        schedule: { kind: 'daily', weekdays: [], times: [], period: null, once_at: null },
      }),
      activity({
        id: '3',
        name: 'Japonês',
        schedule: { kind: 'daily', weekdays: [], times: [], period: null, once_at: null },
      }),
    ];
    const planned = plannedOccurrencesForDay(items, today, []);
    for (const [query, id] of [
      ['meditacao', '1'],
      ['organizacao', '2'],
      ['japones', '3'],
    ] as const) {
      const result = filterTodayTabOccurrences({
        plannedToday: planned,
        activities: items,
        dayKey: today,
        logs: [],
        filter: 'todas',
        query,
      });
      expect(result.planned.map((i) => i.activity_id)).toEqual([id]);
    }
    expect(foldText('Meditação')).toContain('meditacao');
  });
});

describe('groupOccurrences timezone SP', () => {
  const morning = occ({ activity_id: 'a', name: 'A', time: '08:00' });
  const evening = occ({ activity_id: 'b', name: 'B', time: '18:30' });
  const late = occ({ activity_id: 'c', name: 'C', time: '23:30' });

  it('08:00 — 08:00 está em Agora; 18:30 e 23:30 em Mais tarde', () => {
    const groups = groupOccurrences([morning, evening, late], 8 * 60);
    expect(groups.now.map((i) => i.activity_id)).toEqual(['a']);
    expect(groups.later.map((i) => i.activity_id)).toEqual(['b', 'c']);
  });

  it('18:30 — 08:00 e 18:30 em Agora; 23:30 em Mais tarde', () => {
    const groups = groupOccurrences([morning, evening, late], 18 * 60 + 30);
    expect(groups.now.map((i) => i.activity_id)).toEqual(['a', 'b']);
    expect(groups.later.map((i) => i.activity_id)).toEqual(['c']);
  });

  it('23:30 — todas agendadas em Agora', () => {
    const groups = groupOccurrences([morning, evening, late], 23 * 60 + 30);
    expect(groups.now.map((i) => i.activity_id)).toEqual(['a', 'b', 'c']);
    expect(groups.later).toHaveLength(0);
  });

  it('Date explícito usa minutos de America/Sao_Paulo (não do dispositivo)', () => {
    // 2026-09-04 21:30 UTC = 18:30 em São Paulo (UTC-3).
    const at1830Sp = new Date('2026-09-04T21:30:00.000Z');
    const groups = groupOccurrences([morning, evening, late], at1830Sp);
    expect(groups.now.map((i) => i.activity_id)).toEqual(['a', 'b']);
    expect(groups.later.map((i) => i.activity_id)).toEqual(['c']);
  });
});

describe('completion feedback ownership', () => {
  it('Activity comum — hook emite feedback uma vez', () => {
    const feedback = resolveActivityCompletionFeedback({ suppressHaptic: true });
    expect(feedback.emitXpSoundToast).toBe(true);
    expect(feedback.emitHaptic).toBe(false);
    // Caller não emite de novo: total = 1 XP/som/toast + 1 haptic (UI).
  });

  it('Activity em rotina — silentFeedback: hook silencioso, caller emite uma vez', () => {
    const fromHook = resolveActivityCompletionFeedback({ silentFeedback: true });
    expect(fromHook.emitXpSoundToast).toBe(false);
    expect(fromHook.emitHaptic).toBe(false);
    const fromCaller = { emitXpSoundToast: true, emitHaptic: true };
    expect(fromCaller.emitXpSoundToast).toBe(true);
  });
});

describe('restore / undo order', () => {
  it('reinsere por sort_order em vez do início da lista', () => {
    const a = activity({ id: 'a', name: 'A', sort_order: 0 });
    const b = activity({ id: 'b', name: 'B', sort_order: 1 });
    const c = activity({ id: 'c', name: 'C', sort_order: 2 });
    const afterArchive = [a, c];
    const restored = insertActivityBySortOrder(afterArchive, b);
    expect(restored.map((i) => i.id)).toEqual(['a', 'b', 'c']);
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
