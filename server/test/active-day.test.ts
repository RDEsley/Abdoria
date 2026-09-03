import { describe, expect, it } from 'vitest';
import { computeStreakFromDayKeys, dayKeysToStreakHistories } from '../../shared/active-day.js';
import { computeStreakWithFrozenDays } from '../../shared/streak/protection.js';
import { addDaysSaoPaulo, getTodaySaoPaulo } from '../../shared/utils/timezone.js';
import { computeActivityReward } from '../../shared/activities/rewards.js';
import { deriveActivityReminders, isDerivedActivityReminderId } from '../../shared/reminders.js';

const today = getTodaySaoPaulo();
const d1 = addDaysSaoPaulo(today, -1);
const d2 = addDaysSaoPaulo(today, -2);

describe('dia ativo e streak por day keys', () => {
  it('é paritário com o cálculo a partir de concluido_em', () => {
    const keys = [d2, d1, today];
    const fromKeys = computeStreakFromDayKeys(keys);
    const fromHistories = computeStreakWithFrozenDays(dayKeysToStreakHistories(keys));
    expect(fromKeys).toEqual(fromHistories);
  });

  it('duas ações no mesmo dia continuam um único dia', () => {
    expect(computeStreakFromDayKeys([today, today]).atual).toBe(1);
  });

  it('frozen e recovery continuam pontes sem incrementar o dia congelado', () => {
    const withFreeze = computeStreakFromDayKeys([d2, today], [d1]);
    const without = computeStreakFromDayKeys([d2, today], []);
    expect(without.atual).toBe(1);
    expect(withFreeze.atual).toBe(2);
  });

  it('meia-noite SP: 23:59 e 00:01 caem em day keys diferentes', () => {
    expect(getTodaySaoPaulo(new Date('2026-08-11T02:59:59.000Z'))).toBe('2026-08-10');
    expect(getTodaySaoPaulo(new Date('2026-08-11T03:00:00.000Z'))).toBe('2026-08-11');
  });
});

describe('recompensas de atividade anti-farm', () => {
  it('paga XP só na primeira conclusão do dia, até 4 atividades distintas', () => {
    expect(
      computeActivityReward({
        kind: 'full',
        alreadyCompletedToday: false,
        distinctXpActivitiesToday: 0,
      }).xp,
    ).toBe(15);
    expect(
      computeActivityReward({
        kind: 'minimum',
        alreadyCompletedToday: false,
        distinctXpActivitiesToday: 0,
      }).xp,
    ).toBe(8);
    expect(
      computeActivityReward({
        kind: 'full',
        alreadyCompletedToday: true,
        distinctXpActivitiesToday: 1,
      }).xp,
    ).toBe(0);
    expect(
      computeActivityReward({
        kind: 'full',
        alreadyCompletedToday: false,
        distinctXpActivitiesToday: 4,
      }).xp,
    ).toBe(0);
  });
});

describe('deriveActivityReminders', () => {
  it('gera ids estáveis e não duplica com lembretes livres', () => {
    const derived = deriveActivityReminders(
      [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Leitura',
          icon: 'star',
          color: 'emerald',
          archived_at: null,
          schedule: { kind: 'daily', times: ['08:00'], weekdays: [] },
          reminder: { enabled: true, offset_min: 10, follow_up: true },
        },
      ],
      [],
    );
    expect(derived.map((item) => item.id)).toEqual([
      'activity:11111111-1111-1111-1111-111111111111:08:00',
      'activity:11111111-1111-1111-1111-111111111111:08:00:followup',
    ]);
    expect(derived.every((item) => isDerivedActivityReminderId(item.id))).toBe(true);
    expect(derived[0]?.schedule.kind === 'recurring' && derived[0].schedule.times[0]).toBe('07:50');
  });

  it('respeita opt-out de lembrete da atividade', () => {
    const derived = deriveActivityReminders(
      [
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Estudo',
          icon: 'target',
          color: 'indigo',
          archived_at: null,
          schedule: { kind: 'daily', times: ['18:00'], weekdays: [] },
          reminder: { enabled: false, offset_min: 0 },
        },
      ],
      [],
    );
    expect(derived).toHaveLength(0);
  });

  it('deriva lembrete por item de rotina, usando os dias da rotina + horário do item', () => {
    const activity = {
      id: 'act-item',
      name: 'Alongamento',
      icon: 'heart',
      color: 'emerald',
      archived_at: null,
      schedule: { kind: 'unscheduled', times: [], weekdays: [] },
      reminder: { enabled: false, offset_min: 0 },
    };
    const routine = {
      id: 'routine-1',
      name: 'Manhã',
      icon: 'calendar',
      color: 'emerald',
      archived_at: null,
      schedule: { kind: 'weekdays', weekdays: [1, 2, 3], times: [], period: null, once_at: null },
      reminder: { enabled: false, offset_min: 0 },
      items: [{ activity_id: activity.id, scheduled_time: '07:00', reminder_enabled: true }],
    };

    const derived = deriveActivityReminders([activity], [routine]);
    expect(derived).toHaveLength(1);
    expect(derived[0].id).toBe(`routine-item:${routine.id}:${activity.id}:07:00`);
    expect(isDerivedActivityReminderId(derived[0].id)).toBe(true);
    expect(derived[0].schedule).toEqual({
      kind: 'recurring',
      times: ['07:00'],
      weekdays: [1, 2, 3],
    });
  });

  it('não deriva lembrete de item sem opt-in (reminder_enabled false)', () => {
    const activity = {
      id: 'act-item',
      name: 'Alongamento',
      icon: 'heart',
      color: 'emerald',
      archived_at: null,
      schedule: { kind: 'unscheduled', times: [], weekdays: [] },
      reminder: { enabled: false, offset_min: 0 },
    };
    const routine = {
      id: 'routine-1',
      name: 'Manhã',
      icon: 'calendar',
      color: 'emerald',
      archived_at: null,
      schedule: { kind: 'daily', times: [], weekdays: [], period: null, once_at: null },
      reminder: { enabled: false, offset_min: 0 },
      items: [{ activity_id: activity.id, scheduled_time: '07:00', reminder_enabled: false }],
    };
    expect(deriveActivityReminders([activity], [routine])).toHaveLength(0);
  });

  it('não deriva lembrete de item quando a rotina não tem agenda ("quando quiser")', () => {
    const activity = {
      id: 'act-item',
      name: 'Alongamento',
      icon: 'heart',
      color: 'emerald',
      archived_at: null,
      schedule: { kind: 'unscheduled', times: [], weekdays: [] },
      reminder: { enabled: false, offset_min: 0 },
    };
    const routine = {
      id: 'routine-1',
      name: 'Manhã',
      icon: 'calendar',
      color: 'emerald',
      archived_at: null,
      schedule: { kind: 'unscheduled', times: [], weekdays: [], period: null, once_at: null },
      reminder: { enabled: false, offset_min: 0 },
      items: [{ activity_id: activity.id, scheduled_time: '07:00', reminder_enabled: true }],
    };
    expect(deriveActivityReminders([activity], [routine])).toHaveLength(0);
  });

  it('não duplica quando a própria atividade já dispara lembrete idêntico', () => {
    const activity = {
      id: 'act-item',
      name: 'Alongamento',
      icon: 'heart',
      color: 'emerald',
      archived_at: null,
      schedule: { kind: 'daily', times: ['07:00'], weekdays: [] },
      reminder: { enabled: true, offset_min: 0 },
    };
    const routine = {
      id: 'routine-1',
      name: 'Manhã',
      icon: 'calendar',
      color: 'emerald',
      archived_at: null,
      schedule: { kind: 'daily', times: [], weekdays: [], period: null, once_at: null },
      reminder: { enabled: false, offset_min: 0 },
      items: [{ activity_id: activity.id, scheduled_time: '07:00', reminder_enabled: true }],
    };
    const derived = deriveActivityReminders([activity], [routine]);
    // Só o lembrete "activity:" — o "routine-item:" idêntico é deduplicado.
    expect(derived).toHaveLength(1);
    expect(derived[0].id).toBe(`activity:${activity.id}:07:00`);
  });

  it('mesma atividade em duas rotinas pode ter lembretes de horários diferentes', () => {
    const activity = {
      id: 'act-shared',
      name: 'Leitura',
      icon: 'star',
      color: 'emerald',
      archived_at: null,
      schedule: { kind: 'unscheduled', times: [], weekdays: [] },
      reminder: { enabled: false, offset_min: 0 },
    };
    const routineA = {
      id: 'routine-a',
      name: 'Manhã',
      icon: 'calendar',
      color: 'emerald',
      archived_at: null,
      schedule: { kind: 'daily', times: [], weekdays: [], period: null, once_at: null },
      reminder: { enabled: false, offset_min: 0 },
      items: [{ activity_id: activity.id, scheduled_time: '07:00', reminder_enabled: true }],
    };
    const routineB = {
      id: 'routine-b',
      name: 'Noite',
      icon: 'calendar',
      color: 'emerald',
      archived_at: null,
      schedule: { kind: 'daily', times: [], weekdays: [], period: null, once_at: null },
      reminder: { enabled: false, offset_min: 0 },
      items: [{ activity_id: activity.id, scheduled_time: '20:00', reminder_enabled: true }],
    };
    const derived = deriveActivityReminders([activity], [routineA, routineB]);
    expect(derived.map((item) => item.id).sort()).toEqual([
      `routine-item:${routineA.id}:${activity.id}:07:00`,
      `routine-item:${routineB.id}:${activity.id}:20:00`,
    ]);
  });
});
