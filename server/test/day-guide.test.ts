import { describe, expect, it } from 'vitest';
import {
  buildDayGuide,
  isRoutineRelevantToday,
  routineDoneActivityIdsToday,
  routineItemsDoneToday,
  type BuildDayGuideInput,
  type DayGuideOccurrenceInput,
  type DayGuideRoutineInput,
} from '../../shared/activities/day-guide.js';
import { activityOccursOnDay } from '../../shared/activities/schedule.js';
import { DEFAULT_ACTIVITY_SCHEDULE } from '../../shared/activities/types.js';

// 2026-09-03 is a Thursday (weekday 4) in America/Sao_Paulo.
const TODAY_KEY = '2026-09-03';

/** 08:00 in America/Sao_Paulo on TODAY_KEY. */
const MORNING_NOW = new Date('2026-09-03T11:00:00.000Z');

function routine(overrides: Partial<DayGuideRoutineInput> = {}): DayGuideRoutineInput {
  return {
    id: 'routine-1',
    name: 'Rotina da manhã',
    schedule: { ...DEFAULT_ACTIVITY_SCHEDULE },
    items: [{ routine_id: 'routine-1', activity_id: 'act-1', position: 0 }],
    ...overrides,
  };
}

function baseInput(overrides: Partial<BuildDayGuideInput> = {}): BuildDayGuideInput {
  return {
    todayKey: TODAY_KEY,
    now: MORNING_NOW,
    trainedToday: true,
    suggestedWorkoutTitle: null,
    routines: [],
    todayLogs: [],
    occurrences: [],
    ...overrides,
  };
}

describe('isRoutineRelevantToday / routineItemsDoneToday', () => {
  it('does not recommend a manual (unscheduled) routine until it was started today', () => {
    const r = routine({ schedule: { ...DEFAULT_ACTIVITY_SCHEDULE, kind: 'unscheduled' } });
    expect(isRoutineRelevantToday(r, TODAY_KEY, [])).toBe(false);

    const startedLogs = [{ routine_id: r.id, activity_id: 'act-1' }];
    expect(isRoutineRelevantToday(r, TODAY_KEY, startedLogs)).toBe(true);
  });

  it('recognizes daily, weekdays-for-today and once-for-today schedules', () => {
    const daily = routine({ schedule: { ...DEFAULT_ACTIVITY_SCHEDULE, kind: 'daily' } });
    expect(isRoutineRelevantToday(daily, TODAY_KEY, [])).toBe(true);

    const weekdaysToday = routine({
      schedule: { ...DEFAULT_ACTIVITY_SCHEDULE, kind: 'weekdays', weekdays: [4] },
    });
    expect(isRoutineRelevantToday(weekdaysToday, TODAY_KEY, [])).toBe(true);

    const onceToday = routine({
      schedule: { ...DEFAULT_ACTIVITY_SCHEDULE, kind: 'once', once_at: '2026-09-03T09:00:00.000Z' },
    });
    expect(isRoutineRelevantToday(onceToday, TODAY_KEY, [])).toBe(true);
  });

  it('does not recommend a routine scheduled for a different weekday', () => {
    const mondayOnly = routine({
      schedule: { ...DEFAULT_ACTIVITY_SCHEDULE, kind: 'weekdays', weekdays: [1] },
    });
    expect(isRoutineRelevantToday(mondayOnly, TODAY_KEY, [])).toBe(false);
  });

  it('keeps completion isolated per routine when the same activity is shared', () => {
    const routineA = routine({
      id: 'rA',
      items: [{ routine_id: 'rA', activity_id: 'shared', position: 0 }],
    });
    const routineB = routine({
      id: 'rB',
      items: [{ routine_id: 'rB', activity_id: 'shared', position: 0 }],
    });
    const logs = [{ routine_id: 'rA', activity_id: 'shared' }];

    expect(routineItemsDoneToday(routineA, logs)).toBe(1);
    expect(routineItemsDoneToday(routineB, logs)).toBe(0);
  });

  it('does not let a standalone completion silently complete a routine item', () => {
    const r = routine({ items: [{ routine_id: 'routine-1', activity_id: 'x', position: 0 }] });
    const standaloneLog = [{ routine_id: null, activity_id: 'x' }];
    expect(routineItemsDoneToday(r, standaloneLog)).toBe(0);
  });
});

describe('routineDoneActivityIdsToday (isolamento do RoutineRunner)', () => {
  it('só conta logs desta rotina, ignorando conclusões avulsas da mesma atividade', () => {
    const r = { id: 'routine-1' };
    const logs = [
      { routine_id: 'routine-1', activity_id: 'a' },
      { routine_id: null, activity_id: 'b' }, // conclusão avulsa fora de qualquer rotina
      { routine_id: 'outra-rotina', activity_id: 'c' }, // mesma atividade em outra rotina
    ];
    expect(routineDoneActivityIdsToday(r, logs)).toEqual(new Set(['a']));
  });

  it('isola a mesma atividade entre duas rotinas diferentes', () => {
    const logs = [{ routine_id: 'rA', activity_id: 'shared' }];
    expect(routineDoneActivityIdsToday({ id: 'rA' }, logs)).toEqual(new Set(['shared']));
    expect(routineDoneActivityIdsToday({ id: 'rB' }, logs)).toEqual(new Set());
  });

  it('ignora logs sem activity_id', () => {
    const logs = [{ routine_id: 'routine-1', activity_id: null }];
    expect(routineDoneActivityIdsToday({ id: 'routine-1' }, logs)).toEqual(new Set());
  });
});

describe('relevância de agenda para "hoje" (routine.schedule reaproveita ActivitySchedule)', () => {
  it('rotina diária ocorre em qualquer dia da semana', () => {
    expect(activityOccursOnDay({ ...DEFAULT_ACTIVITY_SCHEDULE, kind: 'daily' }, TODAY_KEY)).toBe(
      true,
    );
  });

  it('rotina de dias da semana só ocorre nos dias marcados', () => {
    const wednesdayOnly = {
      ...DEFAULT_ACTIVITY_SCHEDULE,
      kind: 'weekdays' as const,
      weekdays: [3],
    };
    const thursdayOnly = { ...DEFAULT_ACTIVITY_SCHEDULE, kind: 'weekdays' as const, weekdays: [4] };
    expect(activityOccursOnDay(wednesdayOnly, TODAY_KEY)).toBe(false);
    expect(activityOccursOnDay(thursdayOnly, TODAY_KEY)).toBe(true);
  });

  it('rotina de data específica só ocorre na data marcada', () => {
    const today = {
      ...DEFAULT_ACTIVITY_SCHEDULE,
      kind: 'once' as const,
      once_at: '2026-09-03T09:00:00.000Z',
    };
    const otherDay = {
      ...DEFAULT_ACTIVITY_SCHEDULE,
      kind: 'once' as const,
      once_at: '2026-09-10T09:00:00.000Z',
    };
    expect(activityOccursOnDay(today, TODAY_KEY)).toBe(true);
    expect(activityOccursOnDay(otherDay, TODAY_KEY)).toBe(false);
  });

  it('rotina sem agenda ("quando quiser") não é tratada como relevante para hoje pela UI', () => {
    // activityOccursOnDay retorna true p/ "unscheduled" (ocorre em qualquer dia),
    // mas a UI de rotinas trata isso como "sem badge Hoje/Agora" explicitamente.
    const unscheduled = { ...DEFAULT_ACTIVITY_SCHEDULE, kind: 'unscheduled' as const };
    expect(activityOccursOnDay(unscheduled, TODAY_KEY)).toBe(true);
  });
});

describe('buildDayGuide', () => {
  it('recommends the routine once it was started today (manual/unscheduled)', () => {
    const r = routine({ schedule: { ...DEFAULT_ACTIVITY_SCHEDULE, kind: 'unscheduled' } });

    const notStarted = buildDayGuide(baseInput({ routines: [r] }));
    expect(notStarted.primary.kind).not.toBe('routine');

    const started = buildDayGuide(
      baseInput({
        routines: [r],
        todayLogs: [{ routine_id: r.id, activity_id: 'some-other-item' }],
      }),
    );
    expect(started.primary.kind).toBe('routine');
  });

  it('updates the guide after the routine is completed', () => {
    const r = routine({ schedule: { ...DEFAULT_ACTIVITY_SCHEDULE, kind: 'daily' } });

    const pending = buildDayGuide(baseInput({ routines: [r] }));
    expect(pending.primary.kind).toBe('routine');

    const completed = buildDayGuide(
      baseInput({
        routines: [r],
        todayLogs: [{ routine_id: r.id, activity_id: 'act-1' }],
      }),
    );
    expect(completed.primary.kind).not.toBe('routine');
    expect(completed.primary.kind).toBe('rest');
  });

  it('suggests rest/review copy when the day is in order (nothing planned)', () => {
    const result = buildDayGuide(baseInput());
    expect(result.primary.kind).toBe('rest');
    expect(result.primary.eyebrow).toBe('DIA EM ORDEM');
    expect(result.secondary).toBeUndefined();
  });

  it('suggests "mais tarde" for an activity planned well ahead of now', () => {
    const occurrence: DayGuideOccurrenceInput = {
      activity_id: 'act-later',
      name: 'Leitura',
      time: '20:00',
      period: 'noite',
      status: 'pending',
    };
    const result = buildDayGuide(baseInput({ occurrences: [occurrence] }));
    expect(result.primary.kind).toBe('activity');
    expect(result.primary.eyebrow).toBe('MAIS TARDE');
  });

  it('ranks routine > urgent activity > workout > later activity', () => {
    const r = routine({ schedule: { ...DEFAULT_ACTIVITY_SCHEDULE, kind: 'daily' } });
    const urgentOccurrence: DayGuideOccurrenceInput = {
      activity_id: 'act-now',
      name: 'Alongamento',
      time: '08:10',
      period: 'manha',
      status: 'pending',
    };
    const laterOccurrence: DayGuideOccurrenceInput = {
      activity_id: 'act-later',
      name: 'Leitura',
      time: '20:00',
      period: 'noite',
      status: 'pending',
    };

    const result = buildDayGuide(
      baseInput({
        trainedToday: false,
        suggestedWorkoutTitle: 'Treino de pernas',
        routines: [r],
        occurrences: [urgentOccurrence, laterOccurrence],
      }),
    );

    expect(result.primary.kind).toBe('routine');
    expect(result.secondary?.kind).toBe('activity');
    expect(result.secondary?.eyebrow).toBe('AGORA');
  });
});
