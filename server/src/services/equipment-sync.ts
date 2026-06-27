import type { UserDocument } from '../domain/User.js';
import { DEFAULT_USER_DADOS_SALVOS } from '../types/index.js';
import { slugsUnlockedByEquipment } from '../../../shared/equipment/index.js';
import type { UserPreferencias } from '../types/index.js';

/** Desbloqueia na biblioteca os exercícios dos equipamentos marcados como possuídos. */
export function syncEquipmentExerciseUnlocks(user: UserDocument, preferencias: UserPreferencias): void {
  const slugs = slugsUnlockedByEquipment(preferencias);
  if (slugs.length === 0) return;

  if (!user.dados_salvos || typeof user.dados_salvos !== 'object') {
    user.dados_salvos = { ...DEFAULT_USER_DADOS_SALVOS };
  }

  const current = new Set(user.dados_salvos.exercicios_desbloqueados ?? []);
  for (const slug of slugs) {
    current.add(slug);
  }
  user.dados_salvos.exercicios_desbloqueados = [...current];
}
