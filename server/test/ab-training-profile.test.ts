import { describe, expect, it } from 'vitest';
import {
  createDefaultAbTrainingProfile,
  doseForAbProfile,
  exerciseCountForProfile,
} from '../../shared/ab-training-profile.js';
import { sanitizeAbTrainingProfileV2 } from '../src/utils/ab-training-profile.js';

describe('perfil abdominal V2', () => {
  it('diferencia quantidade e dose por intensidade e tipo', () => {
    const moderate = createDefaultAbTrainingProfile('2026-08-29T12:00:00.000Z');
    const evolyn = { ...moderate, intensity: 'evolyn' as const, volume: 'completo' as const };
    expect(exerciseCountForProfile(moderate)).toBe(6);
    expect(exerciseCountForProfile(evolyn)).toBe(9);
    expect(doseForAbProfile(evolyn, 'reps', 12)).toBe(15);
    expect(doseForAbProfile(evolyn, 'tempo', 30)).toBe(35);
    expect(doseForAbProfile(evolyn, 'tempo', 9999)).toBe(600);
  });

  it('normaliza a agenda, descarta equipamento legado e rejeita versões inválidas', () => {
    const profile = sanitizeAbTrainingProfileV2({
      version: 2,
      intensity: 'leve',
      volume: 'curto',
      training_days: [5, 1, 1],
      rest_seconds: 44,
      equipment: { ab_wheel: true, unknown: true },
    });
    expect(profile?.training_days).toEqual([1, 5]);
    expect(profile?.rest_seconds).toBe(45);
    expect(profile).not.toHaveProperty('equipment');
    expect(sanitizeAbTrainingProfileV2({ version: 1 })).toBeNull();
  });

  it('respeita configuração personalizada na quantidade, séries e dose', () => {
    const custom = sanitizeAbTrainingProfileV2({
      version: 2,
      intensity: 'leve',
      volume: 'curto',
      training_days: [1, 3],
      rest_seconds: 30,
      mode: 'custom',
      custom: { exercise_count: 9, effort: 'intenso', series: 4, target_reps: 15, rest_seconds: 20 },
    });
    expect(custom?.mode).toBe('custom');
    expect(exerciseCountForProfile(custom!)).toBe(9);
    expect(doseForAbProfile(custom!, 'reps', 12)).toBe(15);
    expect(doseForAbProfile(custom!, 'tempo', 30)).toBeGreaterThanOrEqual(30);
  });

  it('aceita custom legado só com exercise_count e effort', () => {
    const custom = sanitizeAbTrainingProfileV2({
      version: 2,
      intensity: 'leve',
      volume: 'curto',
      training_days: [1, 3],
      rest_seconds: 30,
      mode: 'custom',
      custom: { exercise_count: 8, effort: 'moderado' },
    });
    expect(custom?.custom?.series).toBe(3);
    expect(custom?.custom?.target_reps).toBe(12);
    expect(doseForAbProfile(custom!, 'reps', 12)).toBe(12);
  });

  it('perfis V2 antigos sem mode continuam preset', () => {
    const profile = sanitizeAbTrainingProfileV2({
      version: 2,
      intensity: 'moderado',
      volume: 'equilibrado',
      training_days: [1, 3, 5],
    });
    expect(profile?.mode).toBe('preset');
    expect(profile?.custom).toBeNull();
    expect(exerciseCountForProfile(profile!)).toBe(6);
  });
});
