import { describe, expect, it } from 'vitest';
import {
  buildNativeNotificationSchedules,
  deriveActivityReminders,
  derivedReminderSource,
  isReminderDueInTimeZone,
  normalizePersonalizedReminder,
  normalizePersonalizedReminders,
  type PersonalizedReminder,
} from '../../shared/reminders.js';

const recurring: PersonalizedReminder = {
  version: 2,
  id: 'hydration',
  title: 'Beber água',
  message: '',
  icon: 'water',
  color: 'sky',
  schedule: { kind: 'recurring', weekdays: [1, 3, 5], times: ['08:00', '16:00'] },
  enabled: true,
  createdAt: '2026-08-29T10:00:00.000Z',
  updatedAt: '2026-08-29T10:00:00.000Z',
};

describe('notificações personalizadas V2', () => {
  it('migra lembretes legados sem perder agenda e estado', () => {
    expect(
      normalizePersonalizedReminder({
        id: 'legacy',
        title: 'Alongar',
        message: 'Pausa rápida',
        time: '19:00',
        weekdays: [1, 3, 5],
        skin: 'nature',
        enabled: false,
        createdAt: '2026-08-01T10:00:00.000Z',
      }),
    ).toMatchObject({
      version: 2,
      id: 'legacy',
      color: 'emerald',
      enabled: false,
      schedule: { kind: 'recurring', times: ['19:00'], weekdays: [1, 3, 5] },
    });
  });

  it('normaliza dados inválidos e remove IDs duplicados', () => {
    const items = normalizePersonalizedReminders([
      recurring,
      { ...recurring, title: 'Duplicada' },
      { version: 2, id: '', title: '', schedule: null },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Beber água');
  });

  it('ignora campo sound legado silenciosamente', () => {
    const parsed = normalizePersonalizedReminder({
      ...recurring,
      sound: 'evolyn_leaf',
    });
    expect(parsed).toBeTruthy();
    expect(parsed!.title).toBe('Beber água');
    expect('sound' in parsed!).toBe(false);
  });

  it('gera recorrência semanal nativa sem janela de 14 dias', () => {
    const schedules = buildNativeNotificationSchedules(recurring);
    expect(schedules).toHaveLength(6);
    expect(schedules).toContainEqual({
      occurrenceKey: 'weekly-1-08:00',
      on: { weekday: 2, hour: 8, minute: 0 },
    });
    expect(schedules.every((schedule) => schedule.at === undefined)).toBe(true);
  });

  it('compacta todos os dias em uma regra recorrente por horário', () => {
    const schedules = buildNativeNotificationSchedules({
      ...recurring,
      schedule: { kind: 'recurring', weekdays: [0, 1, 2, 3, 4, 5, 6], times: ['09:15'] },
    });
    expect(schedules).toEqual([{ occurrenceKey: 'daily-09:15', on: { hour: 9, minute: 15 } }]);
  });

  it('preserva agendamento único com data absoluta', () => {
    const schedules = buildNativeNotificationSchedules({
      ...recurring,
      schedule: { kind: 'once', at: '2026-09-10T12:30:00.000Z' },
    });
    expect(schedules).toEqual([{ occurrenceKey: 'once', at: '2026-09-10T12:30:00.000Z' }]);
  });

  it('detecta lembrete recorrente no fuso informado', () => {
    const instant = new Date('2026-09-02T11:00:00.000Z');
    expect(isReminderDueInTimeZone(recurring, instant, 'America/Sao_Paulo')).toBe(true);
  });
});

describe('deriveActivityReminders — rotina e item', () => {
  const activity = {
    id: 'act-med',
    name: 'Meditação',
    icon: 'leaf',
    color: 'emerald',
    archived_at: null,
    schedule: {
      kind: 'daily' as const,
      weekdays: [],
      times: ['07:00'],
      period: null,
      once_at: null,
    },
    reminder: { enabled: true, offset_min: 0, follow_up: false },
  };

  const routine = {
    id: 'rot-manha',
    name: 'Rotina da manhã',
    icon: 'calendar',
    color: 'emerald',
    archived_at: null,
    schedule: {
      kind: 'daily' as const,
      weekdays: [],
      times: ['07:00'],
      period: null,
      once_at: null,
    },
    reminder: { enabled: true, offset_min: 0, follow_up: false },
    items: [
      { activity_id: 'act-med', scheduled_time: '07:00', reminder_enabled: true },
      { activity_id: 'act-cafe', scheduled_time: '07:15', reminder_enabled: true },
    ],
  };

  const cafe = {
    id: 'act-cafe',
    name: 'Café da manhã',
    icon: 'star',
    color: 'amber',
    archived_at: null,
    schedule: {
      kind: 'unscheduled' as const,
      weekdays: [],
      times: [],
      period: null,
      once_at: null,
    },
    reminder: { enabled: false, offset_min: 0, follow_up: false },
  };

  it('deriva lembrete da rotina com id estável', () => {
    const derived = deriveActivityReminders([], [routine]);
    expect(derived.some((item) => item.id.startsWith('routine:rot-manha:'))).toBe(true);
  });

  it('deriva lembrete por item com id determinístico', () => {
    const derived = deriveActivityReminders(
      [cafe],
      [{ ...routine, reminder: { enabled: false, offset_min: 0, follow_up: false } }],
    );
    expect(derived.map((item) => item.id)).toContain('routine-item:rot-manha:act-cafe:07:15');
  });

  it('não duplica item da rotina quando a Activity já lembra no mesmo horário', () => {
    const derived = deriveActivityReminders([activity, cafe], [routine]);
    expect(derived.some((item) => item.id === 'routine-item:rot-manha:act-med:07:00')).toBe(false);
    expect(derived.some((item) => item.id.startsWith('activity:act-med:'))).toBe(true);
    expect(derived.some((item) => item.id === 'routine-item:rot-manha:act-cafe:07:15')).toBe(true);
  });

  it('não deriva nada se a rotina está sem agenda ou sem opt-in', () => {
    const manual = {
      ...routine,
      schedule: {
        kind: 'unscheduled' as const,
        weekdays: [],
        times: [],
        period: null,
        once_at: null,
      },
      reminder: { enabled: false, offset_min: 0, follow_up: false },
      items: [{ activity_id: 'act-cafe', scheduled_time: '07:15', reminder_enabled: false }],
    };
    expect(deriveActivityReminders([cafe], [manual])).toEqual([]);
  });
});

describe('derivedReminderSource', () => {
  it('distingue activity vs rotina no follow-up (não trata UUID de rotina como activity_id)', () => {
    expect(derivedReminderSource('activity:act-1:08:00:followup')).toEqual({
      kind: 'activity',
      id: 'act-1',
    });
    expect(derivedReminderSource('routine:rot-1:07:00:followup')).toEqual({
      kind: 'routine',
      id: 'rot-1',
    });
    expect(derivedReminderSource('routine-item:rot-1:act-1:07:00')).toBeNull();
  });
});
