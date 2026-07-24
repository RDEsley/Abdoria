/**
 * Drop diário de Frozen Streak da Exploração AFK.
 *
 * Modelo antigo (janelas de 24h de acúmulo) tinha dois defeitos fatais:
 * o acúmulo zera a cada coleta (quem coletava o baú nunca completava janela)
 * e o seed era fixo por usuário (80% das contas nunca dropavam). O modelo
 * atual rola uma vez por dia-calendário (SP), com seed usuário+data — todo
 * dia é uma chance nova e independente, sem estado extra além do dedupe.
 */

/** 30% ao dia ⇒ ~2,1 Frozen Streaks por semana pra quem mantém a Exploração ativa. */
export const AFK_FROZEN_STREAK_DAILY_THRESHOLD = 3000;

export function hashFrozenStreakSeed(userId: string, dayKey: string | number): number {
  let h = 2166136261;
  const s = `frozen:${userId}:${dayKey}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Roll determinístico do dia — mesmo resultado em qualquer sync do mesmo dia. */
export function rollDailyFrozenStreak(userId: string, dayKey: string): boolean {
  return hashFrozenStreakSeed(userId, dayKey) % 10000 < AFK_FROZEN_STREAK_DAILY_THRESHOLD;
}
