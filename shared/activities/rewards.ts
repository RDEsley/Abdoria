export const ACTIVITY_XP_FULL = 15;
export const ACTIVITY_XP_MINIMUM = 8;
export const ACTIVITY_XP_DISTINCT_CAP = 4;
export const ROUTINE_BONUS_XP = 10;

export interface ActivityRewardInput {
  kind: 'full' | 'minimum';
  alreadyCompletedToday: boolean;
  distinctXpActivitiesToday: number;
}

export interface ActivityRewardResult {
  xp: number;
  leaves: number;
  firstOfDay: boolean;
}

export function computeActivityReward(input: ActivityRewardInput): ActivityRewardResult {
  if (input.alreadyCompletedToday) {
    return { xp: 0, leaves: 0, firstOfDay: false };
  }
  if (input.distinctXpActivitiesToday >= ACTIVITY_XP_DISTINCT_CAP) {
    return { xp: 0, leaves: 0, firstOfDay: true };
  }
  return {
    xp: input.kind === 'minimum' ? ACTIVITY_XP_MINIMUM : ACTIVITY_XP_FULL,
    leaves: 0,
    firstOfDay: true,
  };
}

export function computeRoutineBonusXp(alreadyAwardedToday: boolean): number {
  return alreadyAwardedToday ? 0 : ROUTINE_BONUS_XP;
}
