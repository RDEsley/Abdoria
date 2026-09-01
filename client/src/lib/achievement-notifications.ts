import type { AchievementIcon, PersonalRecordNotice, UnlockedAchievementNotice } from '@/types';

type AchievementToastType = 'achievement' | 'record';

export interface TriggerAchievementPayload {
  title: string;
  description: string;
  type?: AchievementToastType;
  icon?: AchievementIcon;
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
function triggerAchievement(payload: TriggerAchievementPayload) {
  if (triggerListener) {
    triggerListener(payload);
    return;
  }
  window.dispatchEvent(new CustomEvent('abdoria:achievement-trigger', { detail: payload }));
}

const ACHIEVEMENT_UNLOCKED_TITLE = 'Conquista desbloqueada!';
const PERSONAL_RECORD_TITLE = 'Novo recorde!';

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
