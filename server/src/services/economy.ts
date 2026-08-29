import type { UserRecord } from '../domain/User.js';
import type { XpBreakdown } from '../types/index.js';
import {
  MOEDA_XP_STEP,
  DEFAULT_COSMETICOS,
  XP_ACHIEVEMENT_BONUS,
  XP_DAILY_MIN_EXERCISES,
  XP_DAILY_PER_EXERCISE,
  XP_PER_SKILL_UNLOCK,
  XP_STREAK_BONUS_MAX,
  XP_STREAK_BONUS_PER_DAY,
  dailyXpCapBreakdown,
  dailyXpCapForLevel,
  spendableXpForShop,
  streakXpBonus,
  projectedMoedaAfterXpSpend as projectedMoedaAfterXpSpendFromState,
  xpFloorForCurrentLevel,
  xpLevelFromTotal,
} from '../types/index.js';
import { resetXpDiarioIfNeeded } from './gamification.js';
import { addWeeklyMoedas, addWeeklyXp } from './weekly-stats.js';

/** Garante carteira de Dorias numérica no documento do usuário. */
export function ensureMoedaWallet(user: UserRecord): void {
  if (!user.cosmeticos || typeof user.cosmeticos !== 'object') {
    user.cosmeticos = { ...DEFAULT_COSMETICOS } as UserRecord['cosmeticos'];
  }

  if (typeof user.cosmeticos.moedas !== 'number' || Number.isNaN(user.cosmeticos.moedas)) {
    user.cosmeticos.moedas = 0;
  }

  if (
    typeof user.cosmeticos.moedas_xp_blocos !== 'number' ||
    Number.isNaN(user.cosmeticos.moedas_xp_blocos)
  ) {
    user.cosmeticos.moedas_xp_blocos = 0;
  }

  if (
    typeof user.cosmeticos.moedas_total_ganhas !== 'number' ||
    Number.isNaN(user.cosmeticos.moedas_total_ganhas)
  ) {
    // Conta antiga sem histórico: o saldo atual é o piso do vitalício real.
    user.cosmeticos.moedas_total_ganhas = user.cosmeticos.moedas;
  }
}

/** Total vitalício de Coins ganhas — base do ranking global (nunca desconta gasto). */
export function readLifetimeMoedas(user: {
  gamificacao: { nivel_xp: number };
  cosmeticos?: {
    moedas?: number | null;
    moedas_xp_blocos?: number | null;
    moedas_total_ganhas?: number | null;
  } | null;
}): number {
  const saldo = readMoedaBalance(user);
  const total = user.cosmeticos?.moedas_total_ganhas;
  return typeof total === 'number' && !Number.isNaN(total) ? Math.max(total, saldo) : saldo;
}

/** Saldo de Dorias — sempre usa valor persistido após primeira sincronização. */
export function readMoedaBalance(user: {
  gamificacao: { nivel_xp: number };
  cosmeticos?: { moedas?: number | null; moedas_xp_blocos?: number | null } | null;
}): number {
  const stored = user.cosmeticos?.moedas;
  if (typeof stored === 'number' && !Number.isNaN(stored)) return stored;
  return Math.floor(Math.max(0, user.gamificacao.nivel_xp) / MOEDA_XP_STEP);
}

/** Saldo de Dorias após gastar XP na loja (desconta conversão passiva por blocos). */
export function projectedMoedaAfterXpSpend(user: UserRecord, xpCost: number): number {
  ensureMoedaWallet(user);
  return projectedMoedaAfterXpSpendFromState(
    user.gamificacao.nivel_xp,
    readMoedaBalance(user),
    user.cosmeticos.moedas_xp_blocos,
    xpCost,
  );
}

export function getDailyXpCapBreakdownForUser(user: UserRecord) {
  const level = xpLevelFromTotal(user.gamificacao.nivel_xp);
  const achievementsUnlocked = user.gamificacao.conquistas?.length ?? 0;
  return dailyXpCapBreakdown(level, 0, achievementsUnlocked);
}

export function getDailyXpCapForUser(user: UserRecord): number {
  return getDailyXpCapBreakdownForUser(user).total;
}

export function isDailyXpCapReached(user: UserRecord): boolean {
  resetXpDiarioIfNeeded(user);
  return user.xp_diario.ganho_hoje >= getDailyXpCapForUser(user);
}

/** XP contabilizado no teto diário unificado (exercícios, streak, conquistas, loja, habilidades). */
export function awardDailyXp(user: UserRecord, amount: number): number {
  if (amount <= 0) return 0;
  resetXpDiarioIfNeeded(user);

  const cap = getDailyXpCapForUser(user);
  const remaining = Math.max(0, cap - user.xp_diario.ganho_hoje);
  const awarded = Math.min(amount, remaining);
  if (awarded <= 0) return 0;

  user.xp_diario.ganho_hoje += awarded;
  user.gamificacao.nivel_xp += awarded;
  addWeeklyXp(user, awarded);
  return awarded;
}

export function applyWorkoutXpBreakdown(user: UserRecord, breakdown: XpBreakdown): number {
  const awarded = awardDailyXp(user, breakdown.total_bruto);
  breakdown.aplicado = awarded;

  let left = awarded;
  const aplicadoExercicios = Math.min(breakdown.exercicios, left);
  left -= aplicadoExercicios;
  const aplicadoStreak = Math.min(breakdown.streak, left);
  left -= aplicadoStreak;
  const aplicadoConquistas = Math.min(breakdown.conquistas, left);

  breakdown.aplicado_diario = aplicadoExercicios;
  breakdown.aplicado_extra = aplicadoStreak + aplicadoConquistas;
  return awarded;
}

export function calculateWorkoutXpBreakdown(
  exerciseCount: number,
  streakAtual: number,
  newAchievements: string[],
): XpBreakdown {
  const exercicios =
    exerciseCount >= XP_DAILY_MIN_EXERCISES ? exerciseCount * XP_DAILY_PER_EXERCISE : 0;
  const streak = streakXpBonus(streakAtual);
  const conquistas = newAchievements.length * XP_ACHIEVEMENT_BONUS;
  const total_diario = exercicios;
  const total_extra = streak + conquistas;
  const total_bruto = total_diario + total_extra;

  return {
    exercicios,
    streak,
    conquistas,
    total_diario,
    total_extra,
    total_bruto,
    aplicado_diario: 0,
    aplicado_extra: 0,
    aplicado: 0,
  };
}

export function awardMoedaFromXp(user: UserRecord): number {
  ensureMoedaWallet(user);
  const blocks = Math.floor(user.gamificacao.nivel_xp / MOEDA_XP_STEP);
  const previous = user.cosmeticos.moedas_xp_blocos;
  const gained = Math.max(0, blocks - previous);
  if (gained > 0) {
    user.cosmeticos.moedas += gained;
    user.cosmeticos.moedas_total_ganhas = (user.cosmeticos.moedas_total_ganhas ?? 0) + gained;
    user.cosmeticos.moedas_xp_blocos = blocks;
    addWeeklyMoedas(user, gained);
  }
  return gained;
}

export function grantMoeda(user: UserRecord, amount: number): void {
  if (amount <= 0) return;
  ensureMoedaWallet(user);
  user.cosmeticos.moedas += amount;
  user.cosmeticos.moedas_total_ganhas = (user.cosmeticos.moedas_total_ganhas ?? 0) + amount;
  addWeeklyMoedas(user, amount);
}

export function spendXpForShop(
  user: UserRecord,
  amount: number,
): { spent: number } | { error: string } {
  if (amount <= 0) return { spent: 0 };

  const totalXp = user.gamificacao.nivel_xp;
  const spendable = spendableXpForShop(totalXp);
  if (amount > spendable) {
    return {
      error: `XP insuficiente no progresso do nível. Você pode usar até ${spendable} XP (0–99% do nível atual).`,
    };
  }

  const currentLevel = xpLevelFromTotal(totalXp);
  const nextTotal = totalXp - amount;
  if (xpLevelFromTotal(nextTotal) < currentLevel) {
    return { error: 'Não é possível gastar XP abaixo do patamar do seu nível atual.' };
  }

  user.gamificacao.nivel_xp = nextTotal;

  const floor = xpFloorForCurrentLevel(nextTotal);
  ensureMoedaWallet(user);
  const newBlocks = Math.floor(nextTotal / MOEDA_XP_STEP);
  const previousBlocks = user.cosmeticos.moedas_xp_blocos;
  if (newBlocks < previousBlocks) {
    user.cosmeticos.moedas = Math.max(0, user.cosmeticos.moedas - (previousBlocks - newBlocks));
    user.cosmeticos.moedas_xp_blocos = Math.max(newBlocks, Math.floor(floor / MOEDA_XP_STEP));
  }

  return { spent: amount };
}

export function awardSkillUnlockXp(user: UserRecord, newUnlockCount: number): number {
  if (newUnlockCount <= 0) return 0;
  return awardDailyXp(user, newUnlockCount * XP_PER_SKILL_UNLOCK);
}

export function countNewSkillUnlocks(previous: string[], next: string[]): number {
  const prev = new Set(previous);
  return next.filter((slug) => slug && !prev.has(slug)).length;
}

export {
  dailyXpCapForLevel,
  dailyXpCapBreakdown,
  MOEDA_XP_STEP,
  streakXpBonus,
  XP_PER_SKILL_UNLOCK,
  XP_STREAK_BONUS_PER_DAY,
  XP_STREAK_BONUS_MAX,
};
