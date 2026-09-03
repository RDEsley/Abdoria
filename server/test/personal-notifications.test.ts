import { describe, expect, it } from 'vitest';
import {
  buildNativeNotificationSchedules,
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
  sound: 'system_default',
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

  it('preserva temas de som suportados e usa padrão para valores desconhecidos', () => {
    expect(normalizePersonalizedReminder({ ...recurring, sound: 'nature' })?.sound).toBe(
      'nature_leaves',
    );
    expect(normalizePersonalizedReminder({ ...recurring, sound: 'arcade' })?.sound).toBe(
      'system_default',
    );
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
