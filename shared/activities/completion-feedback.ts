/**
 * Ownership do feedback ao completar Activity.
 * - hook (padrão): XP orb + som + toast (+ haptic, salvo suppressHaptic)
 * - caller (silentFeedback): RoutineRunner emite XP/som/toast; haptic fica só na UI imediata
 * Preferência: 1 haptic por conclusão (na interação), nunca segundo após a API.
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
