import { EQUIPMENT_IDS } from '../../../shared/equipment/index.js';
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

  const rawEquipment =
    value.equipment && typeof value.equipment === 'object' && !Array.isArray(value.equipment)
      ? (value.equipment as Record<string, unknown>)
      : {};
  const equipment = Object.fromEntries(EQUIPMENT_IDS.map((id) => [id, rawEquipment[id] === true]));
  const now = new Date().toISOString();
  return {
    version: 2,
    intensity,
    training_days: days,
    volume,
    equipment,
    created_at: typeof value.created_at === 'string' ? value.created_at : now,
    updated_at: now,
  };
}
