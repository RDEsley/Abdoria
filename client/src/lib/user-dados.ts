import type {
  IUserDocument,
  NivelUsuario,
  SavedWorkoutPreset,
  StoredRepScheme,
  UserDadosSalvos,
} from '@/types';
import { mergeUserDadosSalvos, resolveUserDadosSalvos, REP_SCHEME_BY_NIVEL } from '@/types';

const LEGACY_CUSTOM_WORKOUT = 'abdoria_custom_workout';
const LEGACY_SAVED_WORKOUTS = 'abdoria_saved_workouts';
const LEGACY_UNLOCKED_PREFIX = 'abdoria_unlocked_exercises';

const NIVEIS: NivelUsuario[] = ['iniciante', 'intermediario', 'avancado'];
const RECOMMENDED_SCHEME_CACHE: Partial<Record<NivelUsuario, StoredRepScheme[]>> = {};

function repSchemeStorageKey(userId: string, nivel: NivelUsuario): string {
  return `abdoria_rep_schemes_${userId}_${nivel}`;
}

function recommendedSchemesForNivel(nivel: NivelUsuario): StoredRepScheme[] {
  if (!RECOMMENDED_SCHEME_CACHE[nivel]) {
    RECOMMENDED_SCHEME_CACHE[nivel] = REP_SCHEME_BY_NIVEL[nivel].map((scheme) => ({
      ...scheme,
      isCustom: false,
    }));
  }
  return RECOMMENDED_SCHEME_CACHE[nivel]!;
}

export function resolveSelectedRepSchemeId(
  persisted: string | undefined,
  schemes: StoredRepScheme[],
): string | null {
  if (schemes.length === 0) return null;
  if (persisted && schemes.some((scheme) => scheme.id === persisted)) return persisted;

  const legacySeed = persisted?.match(/^seed-(?:iniciante|intermediario|avancado)-(.+)$/);
  if (legacySeed && schemes.some((scheme) => scheme.id === legacySeed[1])) {
    return legacySeed[1];
  }

  return schemes[0]?.id ?? null;
}

export function getRepSchemesForNivel(dados: UserDadosSalvos, nivel: NivelUsuario): StoredRepScheme[] {
  const stored = dados.esquemas_reps[nivel];
  if (stored && stored.length > 0) return stored;
  return recommendedSchemesForNivel(nivel);
}

function readLegacyRepSchemes(userId: string): Partial<Record<NivelUsuario, StoredRepScheme[]>> {
  const esquemas: Partial<Record<NivelUsuario, StoredRepScheme[]>> = {};
  for (const nivel of NIVEIS) {
    try {
      const raw = localStorage.getItem(repSchemeStorageKey(userId, nivel));
      if (raw === null) continue;
      esquemas[nivel] = JSON.parse(raw) as StoredRepScheme[];
    } catch {
      // ignore corrupt legacy data
    }
  }
  return esquemas;
}

function readLegacyUnlocked(userId: string): string[] {
  try {
    const raw = localStorage.getItem(`${LEGACY_UNLOCKED_PREFIX}:${userId}`);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function readLegacyCustomWorkout(): UserDadosSalvos['treino_personalizado'] {
  try {
    const raw = localStorage.getItem(LEGACY_CUSTOM_WORKOUT);
    return raw ? (JSON.parse(raw) as UserDadosSalvos['treino_personalizado']) : [];
  } catch {
    return [];
  }
}

function readLegacySavedWorkouts(): SavedWorkoutPreset[] {
  try {
    const raw = localStorage.getItem(LEGACY_SAVED_WORKOUTS);
    return raw ? (JSON.parse(raw) as SavedWorkoutPreset[]) : [];
  } catch {
    return [];
  }
}

function isEmptyDadosSalvos(dados: UserDadosSalvos): boolean {
  return (
    dados.treino_personalizado.length === 0
    && dados.treinos_salvos.length === 0
    && Object.keys(dados.esquemas_reps).length === 0
    && dados.exercicios_desbloqueados.length === 0
  );
}

export function collectLegacyLocalData(userId: string): Partial<UserDadosSalvos> {
  const patch: Partial<UserDadosSalvos> = {};
  const custom = readLegacyCustomWorkout();
  const saved = readLegacySavedWorkouts();
  const unlocked = readLegacyUnlocked(userId);
  const esquemas = readLegacyRepSchemes(userId);

  if (custom.length > 0) patch.treino_personalizado = custom;
  if (saved.length > 0) patch.treinos_salvos = saved;
  if (unlocked.length > 0) patch.exercicios_desbloqueados = unlocked;
  if (Object.keys(esquemas).length > 0) patch.esquemas_reps = esquemas;

  return patch;
}

export function hasLegacyLocalData(userId: string): boolean {
  if (localStorage.getItem(LEGACY_CUSTOM_WORKOUT)) return true;
  if (localStorage.getItem(LEGACY_SAVED_WORKOUTS)) return true;
  if (localStorage.getItem(`${LEGACY_UNLOCKED_PREFIX}:${userId}`)) return true;
  return NIVEIS.some((nivel) => localStorage.getItem(repSchemeStorageKey(userId, nivel)) !== null);
}

export function clearLegacyLocalData(userId: string): void {
  localStorage.removeItem(LEGACY_CUSTOM_WORKOUT);
  localStorage.removeItem(LEGACY_SAVED_WORKOUTS);
  localStorage.removeItem(`${LEGACY_UNLOCKED_PREFIX}:${userId}`);
  for (const nivel of NIVEIS) {
    localStorage.removeItem(repSchemeStorageKey(userId, nivel));
  }
}

export function hydrateUserDadosFromAccount(user: IUserDocument): UserDadosSalvos {
  return resolveUserDadosSalvos(user.dados_salvos);
}

export function buildMigrationPatch(
  user: IUserDocument,
  current: UserDadosSalvos,
): Partial<UserDadosSalvos> | null {
  if (!hasLegacyLocalData(user.id)) return null;
  const legacy = collectLegacyLocalData(user.id);
  if (Object.keys(legacy).length === 0) return null;

  if (isEmptyDadosSalvos(current)) {
    return legacy;
  }

  return mergeUserDadosSalvos(current, legacy);
}

export { mergeUserDadosSalvos, resolveUserDadosSalvos };
