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
      equipment: { ab_wheel: true, unknown: true },
    });
    expect(profile?.training_days).toEqual([1, 5]);
    expect(profile).not.toHaveProperty('equipment');
    expect(sanitizeAbTrainingProfileV2({ version: 1 })).toBeNull();
  });
});
