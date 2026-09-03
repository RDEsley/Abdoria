import type {
  AbTrainingCustomConfig,
  AbTrainingEffort,
  AbTrainingIntensity,
  AbTrainingProfileV2,
  AbTrainingVolume,
} from './types/index.js';

export const AB_TRAINING_PROFILE_VERSION = 2 as const;

export const AB_INTENSITY_LABELS: Record<AbTrainingIntensity, string> = {
  leve: 'Leve',
  moderado: 'Moderado',
  evolyn: 'Evolyn',
};

export const AB_EFFORT_LABELS: Record<AbTrainingEffort, string> = {
  leve: 'Suave',
  moderado: 'Equilibrado',
  intenso: 'Intenso',
};

export const AB_VOLUME_LABELS: Record<AbTrainingVolume, string> = {
  curto: 'Rápido · 10 min',
  equilibrado: 'Equilibrado · 20 min',
  completo: 'Completo · 30 min',
};

export const AB_CUSTOM_EXERCISE_MIN = 4;
export const AB_CUSTOM_EXERCISE_MAX = 10;

const EXERCISE_COUNTS: Record<AbTrainingIntensity, Record<AbTrainingVolume, number>> = {
  leve: { curto: 4, equilibrado: 5, completo: 5 },
  moderado: { curto: 6, equilibrado: 6, completo: 7 },
  evolyn: { curto: 8, equilibrado: 8, completo: 9 },
};

const EFFORT_TO_INTENSITY: Record<AbTrainingEffort, AbTrainingIntensity> = {
  leve: 'leve',
  moderado: 'moderado',
  intenso: 'evolyn',
};

export function isCustomAbTrainingProfile(profile: AbTrainingProfileV2): boolean {
  return profile.mode === 'custom' && Boolean(profile.custom);
}

export function clampCustomExerciseCount(value: number): number {
  if (!Number.isFinite(value)) return 6;
  return Math.min(AB_CUSTOM_EXERCISE_MAX, Math.max(AB_CUSTOM_EXERCISE_MIN, Math.round(value)));
}

export function sanitizeAbTrainingCustom(
  raw: unknown,
): AbTrainingCustomConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const effort = (['leve', 'moderado', 'intenso'] as const).find((item) => item === value.effort);
  if (!effort) return null;
  return {
    exercise_count: clampCustomExerciseCount(Number(value.exercise_count)),
    effort,
  };
}

export function exerciseCountForProfile(profile: AbTrainingProfileV2): number {
  if (isCustomAbTrainingProfile(profile) && profile.custom) {
    return clampCustomExerciseCount(profile.custom.exercise_count);
  }
  return EXERCISE_COUNTS[profile.intensity][profile.volume];
}

function doseIntensity(profile: AbTrainingProfileV2): AbTrainingIntensity {
  if (isCustomAbTrainingProfile(profile) && profile.custom) {
    return EFFORT_TO_INTENSITY[profile.custom.effort];
  }
  return profile.intensity;
}

/** Prescrição por tipo: tempo e repetições nunca compartilham uma dose cega. */
export function doseForAbProfile(
  profile: AbTrainingProfileV2,
  mode: import('./types/index.js').ModoExercicio,
  base: number,
  cycleWeek = 1,
): number {
  const progression = 1 + Math.min(Math.max(cycleWeek - 1, 0), 3) * 0.04;
  const intensity = doseIntensity(profile);
  const factor =
    mode === 'tempo'
      ? { leve: 0.75, moderado: 1, evolyn: 1.2 }[intensity]
      : { leve: 0.8, moderado: 1, evolyn: 1.25 }[intensity];
  const raw = base * factor * progression;
  if (mode === 'tempo') return Math.min(600, Math.max(10, Math.round(raw / 5) * 5));
  return Math.min(30, Math.max(4, Math.round(raw)));
}

/** Estimativa simples da sessão a partir do perfil — não depende da fila gerada. */
export function estimateSessionMinutesForProfile(profile: AbTrainingProfileV2): number {
  const count = exerciseCountForProfile(profile);
  return Math.max(8, Math.round((count * (90 + profile.rest_seconds)) / 60));
}

export function createDefaultAbTrainingProfile(
  now = new Date().toISOString(),
  restSeconds = 30,
): AbTrainingProfileV2 {
  return {
    version: 2,
    intensity: 'moderado',
    training_days: [1, 3, 5],
    volume: 'equilibrado',
    rest_seconds: restSeconds,
    mode: 'preset',
    custom: null,
    created_at: now,
    updated_at: now,
  };
}
