import type { UserPreferencias } from '../types/index.js';

/** Equipamentos opcionais que desbloqueiam exercícios no catálogo. */
export type EquipmentId = 'push_up_board' | 'pull_up_bar' | 'ab_wheel' | 'stability_ball';

export interface EquipmentDefinition {
  id: EquipmentId;
  nome: string;
  descricao: string;
  /** Slugs liberados quando o usuário possui o equipamento. */
  exerciseSlugs: readonly string[];
  /** Link opcional para compra (ex.: Mercado Livre). */
  purchaseUrl?: string;
}

export const EQUIPMENT_CATALOG: readonly EquipmentDefinition[] = [
  {
    id: 'push_up_board',
    nome: 'Prancha de Flexão 9 em 1',
    descricao: '9 variações de flexão por posição e cor — peito, ombros, costas e tríceps.',
    exerciseSlugs: [
      'push-up-board-chest',
      'push-up-board-chest-wide',
      'push-up-board-decline',
      'push-up-board-triceps',
      'push-up-board-triceps-diamond',
      'push-up-board-shoulders',
      'push-up-board-shoulders-pike',
      'push-up-board-back',
      'push-up-board-back-wide',
    ],
    purchaseUrl:
      'https://www.mercadolivre.com.br/p/MLB64302822?matt_tool=38524122&pdp_filters=item_id:MLB4421861011&ua=nUCtTuSuVgT4qRpEAHq-vjywSt8yB7Ta5KFEOXFQFUmZBxZE#origin=share&sid=share&wid=MLB4421861011&action=copy',
  },
  {
    id: 'pull_up_bar',
    nome: 'Barra Fixa',
    descricao: 'Puxadas, chin-ups e suspensão isométrica para costas e grip.',
    exerciseSlugs: ['pull-up', 'chin-up', 'dead-hang'],
  },
  {
    id: 'ab_wheel',
    nome: 'Roda Abdominal (Rolinho)',
    descricao: 'Rollouts no joelho, amplitude completa e progressões avançadas.',
    exerciseSlugs: ['ab-wheel-knees', 'ab-wheel', 'ab-wheel-standing'],
    purchaseUrl:
      'https://www.mercadolivre.com.br/p/MLB26054619?matt_tool=38524122&pdp_filters=item_id:MLB3411770569&ua=964TOli9qe-gWQK7zlIWU1UyY_MlpNh3Pu1QQMdrij9E_r0P#origin=share&sid=share&wid=MLB3411770569&action=copy',
  },
  {
    id: 'stability_ball',
    nome: 'Bola Suíça',
    descricao: 'Abdominais sobre a bola — maior amplitude e ativação do core.',
    exerciseSlugs: ['stability-ball-crunch'],
  },
] as const;

export const EQUIPMENT_IDS: EquipmentId[] = EQUIPMENT_CATALOG.map((e) => e.id);

const SLUGS_BY_EQUIPMENT = Object.fromEntries(
  EQUIPMENT_CATALOG.map((e) => [e.id, [...e.exerciseSlugs]]),
) as Record<EquipmentId, string[]>;

export function getExerciseSlugsForEquipment(id: EquipmentId): string[] {
  return SLUGS_BY_EQUIPMENT[id] ?? [];
}

export function getAllEquipmentExerciseSlugs(): string[] {
  return EQUIPMENT_CATALOG.flatMap((e) => [...e.exerciseSlugs]);
}

export function resolveUserEquipment(
  preferencias?: UserPreferencias | null,
): Record<EquipmentId, boolean> {
  const raw = preferencias?.equipamentos ?? {};
  return {
    push_up_board: Boolean(raw.push_up_board),
    pull_up_bar: Boolean(raw.pull_up_bar),
    ab_wheel: Boolean(raw.ab_wheel),
    stability_ball: Boolean(raw.stability_ball),
  };
}

export function getEnabledEquipmentIds(preferencias?: UserPreferencias | null): EquipmentId[] {
  const state = resolveUserEquipment(preferencias);
  return EQUIPMENT_IDS.filter((id) => state[id]);
}

export function slugsUnlockedByEquipment(preferencias?: UserPreferencias | null): string[] {
  const enabled = getEnabledEquipmentIds(preferencias);
  const slugs = new Set<string>();
  for (const id of enabled) {
    for (const slug of getExerciseSlugsForEquipment(id)) {
      slugs.add(slug);
    }
  }
  return [...slugs];
}

export interface ExerciseEquipmentFields {
  ativo: boolean;
  equipamento?: EquipmentId | null;
}

/**
 * Regra única de disponibilidade:
 * - Exercício QUE EXIGE equipamento só aparece se o usuário possui (marcou) esse equipamento,
 *   independentemente de `ativo` — equipamento desmarcado nunca vaza para recomendações/catálogo.
 * - Exercício sem equipamento aparece quando está ativo no catálogo.
 */
export function isExerciseAvailableForUser(
  exercise: ExerciseEquipmentFields,
  preferencias?: UserPreferencias | null,
): boolean {
  if (exercise.equipamento) {
    const owned = resolveUserEquipment(preferencias);
    return Boolean(owned[exercise.equipamento]);
  }
  return exercise.ativo;
}

/** Slugs que o usuário pediu para não recomendar. */
export function getBlockedExerciseSlugs(preferencias?: UserPreferencias | null): string[] {
  return preferencias?.exercicios_nao_recomendar ?? [];
}

/**
 * Critério combinado para entrar nas recomendações de treino:
 * disponível (equipamento marcado / ativo) E não bloqueado pelo usuário.
 */
export function isExerciseRecommendable(
  exercise: ExerciseEquipmentFields & { slug: string },
  preferencias?: UserPreferencias | null,
): boolean {
  if (getBlockedExerciseSlugs(preferencias).includes(exercise.slug)) return false;
  return isExerciseAvailableForUser(exercise, preferencias);
}
