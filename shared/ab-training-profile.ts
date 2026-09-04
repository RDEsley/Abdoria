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
export const AB_CUSTOM_SERIES_MIN = 2;
export const AB_CUSTOM_SERIES_MAX = 5;
export const AB_CUSTOM_REPS_MIN = 6;
export const AB_CUSTOM_REPS_MAX = 20;
export const AB_CUSTOM_REST_MIN = 15;
export const AB_CUSTOM_REST_MAX = 90;

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

const SERIES_BY_INTENSITY: Record<AbTrainingIntensity, number> = {
  leve: 2,
  moderado: 3,
  evolyn: 4,
};

const REST_BY_INTENSITY: Record<AbTrainingIntensity, number> = {
  leve: 45,
  moderado: 30,
  evolyn: 20,
};

const DEFAULTS_BY_EFFORT: Record<
  AbTrainingEffort,
  { series: number; target_reps: number; rest_seconds: number }
> = {
  leve: { series: 2, target_reps: 10, rest_seconds: 45 },
  moderado: { series: 3, target_reps: 12, rest_seconds: 30 },
  intenso: { series: 4, target_reps: 15, rest_seconds: 20 },
};

export function isCustomAbTrainingProfile(profile: AbTrainingProfileV2): boolean {
  return profile.mode === 'custom' && Boolean(profile.custom);
}

export function clampCustomExerciseCount(value: number): number {
  if (!Number.isFinite(value)) return 6;
  return Math.min(AB_CUSTOM_EXERCISE_MAX, Math.max(AB_CUSTOM_EXERCISE_MIN, Math.round(value)));
}

export function clampCustomSeries(value: number): number {
  if (!Number.isFinite(value)) return 3;
  return Math.min(AB_CUSTOM_SERIES_MAX, Math.max(AB_CUSTOM_SERIES_MIN, Math.round(value)));
}

export function clampCustomReps(value: number): number {
  if (!Number.isFinite(value)) return 12;
  return Math.min(AB_CUSTOM_REPS_MAX, Math.max(AB_CUSTOM_REPS_MIN, Math.round(value)));
}

export function clampCustomRest(value: number): number {
  if (!Number.isFinite(value)) return 30;
  return Math.min(AB_CUSTOM_REST_MAX, Math.max(AB_CUSTOM_REST_MIN, Math.round(value / 5) * 5));
}

export function effortFromTargetReps(reps: number): AbTrainingEffort {
  const value = clampCustomReps(reps);
  if (value <= 10) return 'leve';
  if (value <= 14) return 'moderado';
  return 'intenso';
}

function resolveCustomEffort(custom: AbTrainingCustomConfig): AbTrainingEffort {
  if (custom.effort === 'leve' || custom.effort === 'moderado' || custom.effort === 'intenso') {
    return custom.effort;
  }
  if (custom.target_reps != null) return effortFromTargetReps(custom.target_reps);
  return 'moderado';
}

/** Completa campos novos a partir de perfis antigos (só exercise_count + effort). */
export function normalizeAbTrainingCustom(custom: AbTrainingCustomConfig): Required<
  Pick<AbTrainingCustomConfig, 'exercise_count' | 'effort' | 'series' | 'target_reps' | 'rest_seconds'>
> {
  const effort = resolveCustomEffort(custom);
  const defaults = DEFAULTS_BY_EFFORT[effort];
  return {
    exercise_count: clampCustomExerciseCount(custom.exercise_count),
    effort,
    series: custom.series != null ? clampCustomSeries(custom.series) : defaults.series,
    target_reps: custom.target_reps != null ? clampCustomReps(custom.target_reps) : defaults.target_reps,
    rest_seconds:
      custom.rest_seconds != null ? clampCustomRest(custom.rest_seconds) : defaults.rest_seconds,
  };
}

export function sanitizeAbTrainingCustom(raw: unknown): AbTrainingCustomConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const effortRaw = (['leve', 'moderado', 'intenso'] as const).find((item) => item === value.effort);
  const hasCount = value.exercise_count != null && Number.isFinite(Number(value.exercise_count));
  if (!hasCount && !effortRaw && value.series == null && value.target_reps == null) return null;

  const effort = effortRaw ?? effortFromTargetReps(Number(value.target_reps ?? 12));
  const normalized = normalizeAbTrainingCustom({
    exercise_count: Number(value.exercise_count ?? 6),
    effort,
    series: value.series != null ? Number(value.series) : undefined,
    target_reps: value.target_reps != null ? Number(value.target_reps) : undefined,
    rest_seconds: value.rest_seconds != null ? Number(value.rest_seconds) : undefined,
  });
  return normalized;
}

export function exerciseCountForProfile(profile: AbTrainingProfileV2): number {
  if (isCustomAbTrainingProfile(profile) && profile.custom) {
    return normalizeAbTrainingCustom(profile.custom).exercise_count;
  }
  return EXERCISE_COUNTS[profile.intensity][profile.volume];
}

export function seriesForProfile(profile: AbTrainingProfileV2): number {
  if (isCustomAbTrainingProfile(profile) && profile.custom) {
    return normalizeAbTrainingCustom(profile.custom).series;
  }
  return SERIES_BY_INTENSITY[profile.intensity];
}

export function restSecondsForProfile(profile: AbTrainingProfileV2): number {
  if (isCustomAbTrainingProfile(profile) && profile.custom) {
    return normalizeAbTrainingCustom(profile.custom).rest_seconds;
  }
  if (Number.isFinite(profile.rest_seconds)) return profile.rest_seconds;
  return REST_BY_INTENSITY[profile.intensity];
}

function doseIntensity(profile: AbTrainingProfileV2): AbTrainingIntensity {
  if (isCustomAbTrainingProfile(profile) && profile.custom) {
    return EFFORT_TO_INTENSITY[normalizeAbTrainingCustom(profile.custom).effort];
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
  if (isCustomAbTrainingProfile(profile) && profile.custom && mode === 'reps') {
    const custom = normalizeAbTrainingCustom(profile.custom);
    return clampCustomReps(custom.target_reps);
  }

  const progression = 1 + Math.min(Math.max(cycleWeek - 1, 0), 3) * 0.04;
  const intensity = doseIntensity(profile);
  const factor =
    mode === 'tempo'
      ? { leve: 0.75, moderado: 1, evolyn: 1.2 }[intensity]
      : { leve: 0.8, moderado: 1, evolyn: 1.25 }[intensity];

  if (isCustomAbTrainingProfile(profile) && profile.custom && mode === 'tempo') {
    const custom = normalizeAbTrainingCustom(profile.custom);
    // Tempo: ancora no alvo de reps (≈2.5s por rep) e aplica o fator de esforço.
    const seeded = custom.target_reps * 2.5;
    const raw = seeded * factor * progression;
    return Math.min(600, Math.max(10, Math.round(raw / 5) * 5));
  }

  const raw = base * factor * progression;
  if (mode === 'tempo') return Math.min(600, Math.max(10, Math.round(raw / 5) * 5));
  return Math.min(30, Math.max(4, Math.round(raw)));
}

/** Estimativa simples da sessão a partir do perfil — não depende da fila gerada. */
export function estimateSessionMinutesForProfile(profile: AbTrainingProfileV2): number {
  const count = exerciseCountForProfile(profile);
  const rest = restSecondsForProfile(profile);
  const series = seriesForProfile(profile);
  return Math.max(8, Math.round((count * series * (55 + rest)) / 60));
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
