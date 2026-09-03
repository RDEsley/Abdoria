import { sanitizeAbTrainingCustom } from '../../../shared/ab-training-profile.js';
import type { AbTrainingProfileV2 } from '../../../shared/types/index.js';

const INTENSITIES: AbTrainingProfileV2['intensity'][] = ['leve', 'moderado', 'evolyn'];
const VOLUMES: AbTrainingProfileV2['volume'][] = ['curto', 'equilibrado', 'completo'];

export function sanitizeAbTrainingProfileV2(raw: unknown): AbTrainingProfileV2 | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const intensity = INTENSITIES.find((item) => item === value.intensity);
  const volume = VOLUMES.find((item) => item === value.volume);
  const days = Array.isArray(value.training_days)
    ? [...new Set(value.training_days.map(Number).filter((day) => day >= 0 && day <= 6))].sort()
    : [];
  if (value.version !== 2 || !intensity || !volume || days.length < 2) return null;
  const rawRest = Number(value.rest_seconds ?? 30);
  const restSeconds = Math.min(120, Math.max(10, Math.round(rawRest / 5) * 5));
  const custom = sanitizeAbTrainingCustom(value.custom);
  const mode = value.mode === 'custom' && custom ? 'custom' : 'preset';

  const now = new Date().toISOString();
  return {
    version: 2,
    intensity,
    training_days: days,
    volume,
    rest_seconds: restSeconds,
    mode,
    custom: mode === 'custom' ? custom : null,
    created_at: typeof value.created_at === 'string' ? value.created_at : now,
    updated_at: now,
  };
}
