import { describe, expect, it } from 'vitest';
import {
  buildWebPushNotificationPayload,
  normalizeNotificationSound,
  resolveNotificationIconUrl,
  resolveNotificationSound,
} from '../../shared/notification-catalog.js';

describe('notification-catalog', () => {
  it('migra sons legados para ids estáveis', () => {
    expect(normalizeNotificationSound('default')).toBe('system_default');
    expect(normalizeNotificationSound('soft')).toBe('minimal_soft');
    expect(normalizeNotificationSound('nature')).toBe('nature_leaves');
    expect(normalizeNotificationSound('motivational')).toBe('melody_rise');
    expect(normalizeNotificationSound('silent')).toBe('silent');
    expect(normalizeNotificationSound('evolyn_leaf')).toBe('evolyn_leaf');
    expect(normalizeNotificationSound('unknown')).toBe('system_default');
  });

  it('resolve aleatório de forma determinística por ocorrência', () => {
    const first = resolveNotificationSound('random', 'reminder-1:daily-08:00');
    const second = resolveNotificationSound('random', 'reminder-1:daily-08:00');
    const other = resolveNotificationSound('random', 'reminder-1:daily-09:00');
    expect(first.id).toBe(second.id);
    expect(first.nativeCustomSound).toBe(true);
    expect(other.id).not.toBe(first.id);
  });

  it('monta payload web push com ícone e silêncio', () => {
    const payload = buildWebPushNotificationPayload(
      {
        id: 'abc',
        title: 'Água',
        message: 'Hora de hidratar',
        icon: 'water',
        sound: 'silent',
      },
      'abc:recurring:08:00:2026-09-02T08:00',
    );
    expect(payload.icon).toBe(resolveNotificationIconUrl('water'));
    expect(payload.badge).toContain('water-96.png');
    expect(payload.silent).toBe(true);
    expect(payload.tag).toBe('abc');
  });

  it('usa som do sistema no payload web para sons customizados', () => {
    const payload = buildWebPushNotificationPayload(
      {
        id: 'abc',
        title: 'Treino',
        message: '',
        icon: 'workout',
        sound: 'evolyn_xp',
      },
      'occ',
    );
    expect(payload.silent).toBe(false);
    expect(payload.icon).toContain('workout-192.png');
  });
});
