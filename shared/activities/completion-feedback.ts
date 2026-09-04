/**
 * Ownership do feedback imediato ao completar Activity.
 * - hook (padrão): XP orb + som + toast (+ haptic, salvo suppressHaptic)
 * - caller (silentFeedback): RoutineRunner / UI especial emite o feedback
 */
export function resolveActivityCompletionFeedback(options?: {
  silentFeedback?: boolean;
  suppressHaptic?: boolean;
}): { emitXpSoundToast: boolean; emitHaptic: boolean } {
  if (options?.silentFeedback) {
    return { emitXpSoundToast: false, emitHaptic: false };
  }
  return {
    emitXpSoundToast: true,
    emitHaptic: !options?.suppressHaptic,
  };
}
