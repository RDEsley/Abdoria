import type { LevelUpCelebration, StreakCelebration } from '@/types';
import { queueStreakUpCelebration } from '@/lib/home-celebrations';
import { prewarmLottieAsset } from '@/hooks/useLottieAsset';

export interface ProgressionFeedbackInput {
  level_up?: LevelUpCelebration | null;
  new_achievements?: Array<{
    id: string;
    titulo: string;
    descricao: string;
    icon?: string;
  }> | null;
  streak_celebration?: StreakCelebration | null;
  userId?: string | null;
}

/**
 * Dispara feedbacks globais de progressão sem duplicar (uma chamada por resultado).
 * XP orbs ficam a cargo do caller (podem ser silent em rotina).
 */
export function emitProgressionFeedback(input: ProgressionFeedbackInput): void {
  if (input.streak_celebration) {
    queueStreakUpCelebration(input.streak_celebration, input.userId ?? undefined);
    void prewarmLottieAsset('/assets/fire-streak.json');
  }
  if (input.level_up?.level_novo) {
    window.dispatchEvent(new CustomEvent('abdoria:level-up', { detail: input.level_up }));
  }
  if (input.new_achievements && input.new_achievements.length > 0) {
    window.dispatchEvent(
      new CustomEvent('abdoria:achievements-unlocked', { detail: input.new_achievements }),
    );
  }
}
