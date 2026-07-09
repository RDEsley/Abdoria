import type {
  AchievementIcon,
  AfkEnemyId,
  PersonalRecordNotice,
  UnlockedAchievementNotice,
} from '@/types';
import { AFK_ENEMIES } from '@/types';

export type AchievementToastType = 'achievement' | 'enemy' | 'record';

export interface TriggerAchievementPayload {
  title: string;
  description: string;
  type?: AchievementToastType;
  icon?: AchievementIcon;
  enemyId?: AfkEnemyId;
  customSoundUrl?: string;
}

export interface AchievementToastItem extends TriggerAchievementPayload {
  id: string;
  type: AchievementToastType;
}

type TriggerListener = (payload: TriggerAchievementPayload) => void;

let triggerListener: TriggerListener | null = null;

export function registerAchievementTrigger(listener: TriggerListener | null) {
  triggerListener = listener;
}

/** Dispara uma notificação global de conquista — funciona fora de componentes React. */
export function triggerAchievement(payload: TriggerAchievementPayload) {
  if (triggerListener) {
    triggerListener(payload);
    return;
  }
  window.dispatchEvent(new CustomEvent('abdoria:achievement-trigger', { detail: payload }));
}

export const ACHIEVEMENT_UNLOCKED_TITLE = 'Conquista desbloqueada!';
export const ENEMY_UNLOCKED_TITLE = 'Novo inimigo!';
export const PERSONAL_RECORD_TITLE = 'Novo recorde!';

export function notifyBestiaryUnlocks(enemyIds: AfkEnemyId[]) {
  for (const enemyId of enemyIds) {
    triggerAchievement({
      type: 'enemy',
      title: ENEMY_UNLOCKED_TITLE,
      description: AFK_ENEMIES[enemyId]?.label ?? enemyId,
      enemyId,
    });
  }
}

export function notifyWorkoutAchievements(achievements: UnlockedAchievementNotice[]) {
  for (const ach of achievements) {
    triggerAchievement({
      type: 'achievement',
      title: ACHIEVEMENT_UNLOCKED_TITLE,
      description: ach.titulo,
      icon: ach.icon,
    });
  }
}

export function notifyPersonalRecords(records: PersonalRecordNotice[]) {
  for (const record of records) {
    const unidade = record.unidade === 'segundos' ? 's' : 'reps';
    triggerAchievement({
      type: 'record',
      title: PERSONAL_RECORD_TITLE,
      description: `${record.nome}: ${record.valor_anterior} → ${record.valor_novo} ${unidade}`,
      icon: 'medal',
    });
  }
}
