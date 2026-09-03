import { describe, expect, it } from 'vitest';
import { isTimeString, normalizeRoutineItems } from '../../shared/activities/routine-items.js';
import { ROUTINE_ITEMS_MAX } from '../../shared/activities/types.js';

describe('isTimeString', () => {
  it('aceita HH:MM válido', () => {
    expect(isTimeString('07:30')).toBe(true);
    expect(isTimeString('23:59')).toBe(true);
    expect(isTimeString('00:00')).toBe(true);
  });

  it('rejeita formatos inválidos', () => {
    expect(isTimeString('24:00')).toBe(false);
    expect(isTimeString('7:30')).toBe(false);
    expect(isTimeString('07:60')).toBe(false);
    expect(isTimeString('')).toBe(false);
    expect(isTimeString(null)).toBe(false);
    expect(isTimeString(undefined)).toBe(false);
  });
});

describe('normalizeRoutineItems', () => {
  it('aceita o formato legado string[] (activity ids)', () => {
    expect(normalizeRoutineItems(['a', 'b', 'c'])).toEqual([
      { activity_id: 'a', scheduled_time: null, reminder_enabled: false },
      { activity_id: 'b', scheduled_time: null, reminder_enabled: false },
      { activity_id: 'c', scheduled_time: null, reminder_enabled: false },
    ]);
  });

  it('aceita objetos ricos com scheduled_time e reminder_enabled', () => {
    expect(
      normalizeRoutineItems([
        { activity_id: 'a', scheduled_time: '07:00', reminder_enabled: true },
        { activity_id: 'b' },
      ]),
    ).toEqual([
      { activity_id: 'a', scheduled_time: '07:00', reminder_enabled: true },
      { activity_id: 'b', scheduled_time: null, reminder_enabled: false },
    ]);
  });

  it('a mesma atividade pode ter horários diferentes em rotinas diferentes (não é global)', () => {
    const routineA = normalizeRoutineItems([
      { activity_id: 'shared', scheduled_time: '07:00', reminder_enabled: true },
    ]);
    const routineB = normalizeRoutineItems([
      { activity_id: 'shared', scheduled_time: '19:30', reminder_enabled: false },
    ]);
    expect(routineA[0].scheduled_time).toBe('07:00');
    expect(routineB[0].scheduled_time).toBe('19:30');
  });

  it('ignora scheduled_time inválido e desativa o lembrete do item', () => {
    expect(
      normalizeRoutineItems([
        { activity_id: 'a', scheduled_time: 'not-a-time', reminder_enabled: true },
      ]),
    ).toEqual([{ activity_id: 'a', scheduled_time: null, reminder_enabled: false }]);
  });

  it('não habilita reminder_enabled sem scheduled_time', () => {
    expect(normalizeRoutineItems([{ activity_id: 'a', reminder_enabled: true }])).toEqual([
      { activity_id: 'a', scheduled_time: null, reminder_enabled: false },
    ]);
  });

  it('descarta ids duplicados mantendo a primeira ocorrência', () => {
    expect(
      normalizeRoutineItems([
        { activity_id: 'a', scheduled_time: '07:00', reminder_enabled: true },
        { activity_id: 'a', scheduled_time: '20:00', reminder_enabled: false },
      ]),
    ).toEqual([{ activity_id: 'a', scheduled_time: '07:00', reminder_enabled: true }]);
  });

  it('descarta entradas sem activity_id e valores não aceitos', () => {
    expect(normalizeRoutineItems([{ scheduled_time: '07:00' }, '', null, 42])).toEqual([]);
  });

  it('respeita o limite ROUTINE_ITEMS_MAX', () => {
    const many = Array.from({ length: ROUTINE_ITEMS_MAX + 5 }, (_, i) => `activity-${i}`);
    expect(normalizeRoutineItems(many)).toHaveLength(ROUTINE_ITEMS_MAX);
  });

  it('retorna vazio para entrada não-array', () => {
    expect(normalizeRoutineItems(undefined)).toEqual([]);
    expect(normalizeRoutineItems({})).toEqual([]);
  });
});
