import type {
  AbTrainingIntensity,
  AbTrainingProfileV2,
  AbTrainingVolume,
  ModoExercicio,
} from './types/index.js';

export const AB_TRAINING_PROFILE_VERSION = 2 as const;

export const AB_INTENSITY_LABELS: Record<AbTrainingIntensity, string> = {
  leve: 'Leve',
  moderado: 'Moderado',
  evolyn: 'Evolyn',
};

export const AB_VOLUME_LABELS: Record<AbTrainingVolume, string> = {
  curto: 'Rápido · 10 min',
  equilibrado: 'Equilibrado · 20 min',
  completo: 'Completo · 30 min',
};

const EXERCISE_COUNTS: Record<AbTrainingIntensity, Record<AbTrainingVolume, number>> = {
  leve: { curto: 4, equilibrado: 5, completo: 5 },
  moderado: { curto: 6, equilibrado: 6, completo: 7 },
  evolyn: { curto: 8, equilibrado: 8, completo: 9 },
};

export function exerciseCountForProfile(profile: AbTrainingProfileV2): number {
  return EXERCISE_COUNTS[profile.intensity][profile.volume];
}

/** Prescrição por tipo: tempo e repetições nunca compartilham uma dose cega. */
export function doseForAbProfile(
  profile: AbTrainingProfileV2,
  mode: ModoExercicio,
  base: number,
  cycleWeek = 1,
): number {
  const progression = 1 + Math.min(Math.max(cycleWeek - 1, 0), 3) * 0.04;
  const factor =
    mode === 'tempo'
      ? { leve: 0.75, moderado: 1, evolyn: 1.2 }[profile.intensity]
      : { leve: 0.8, moderado: 1, evolyn: 1.25 }[profile.intensity];
  const raw = base * factor * progression;
  if (mode === 'tempo') return Math.min(600, Math.max(10, Math.round(raw / 5) * 5));
  return Math.min(30, Math.max(4, Math.round(raw)));
}

export function createDefaultAbTrainingProfile(
  now = new Date().toISOString(),
): AbTrainingProfileV2 {
  return {
    version: 2,
    intensity: 'moderado',
    training_days: [1, 3, 5],
    volume: 'equilibrado',
    equipment: {},
    created_at: now,
    updated_at: now,
  };
}
