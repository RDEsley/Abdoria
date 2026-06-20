import type { UserDocument } from '../models/User.js';
import type { XpBreakdown } from '../types/index.js';
import {
  ABDORIA_XP_STEP,
  DEFAULT_COSMETICOS,
  XP_ACHIEVEMENT_BONUS,
  XP_DAILY_MIN_EXERCISES,
  XP_DAILY_PER_EXERCISE,
  XP_PER_SKILL_UNLOCK,
  XP_STREAK_BONUS_MAX,
  XP_STREAK_BONUS_PER_DAY,
  dailyXpCapForLevel,
  spendableXpForShop,
  streakXpBonus,
  projectedAbdoriaAfterXpSpend as projectedAbdoriaAfterXpSpendFromState,
  xpFloorForCurrentLevel,
  xpLevelFromTotal,
} from '../types/index.js';
import { resetXpDiarioIfNeeded } from './gamification.js';

/** Garante carteira Abdoria numérica no documento do usuário. */
export function ensureAbdoriaWallet(user: UserDocument): void {
  if (!user.cosmeticos || typeof user.cosmeticos !== 'object') {
    user.cosmeticos = { ...DEFAULT_COSMETICOS } as UserDocument['cosmeticos'];
  }

  if (typeof user.cosmeticos.moedas !== 'number' || Number.isNaN(user.cosmeticos.moedas)) {
    user.cosmeticos.moedas = 0;
  }

  if (
    typeof user.cosmeticos.moedas_xp_blocos !== 'number'
    || Number.isNaN(user.cosmeticos.moedas_xp_blocos)
  ) {
    user.cosmeticos.moedas_xp_blocos = 0;
  }
}

/** Saldo Abdoria — sempre usa valor persistido após primeira sincronização. */
export function readAbdoriaBalance(user: {
  gamificacao: { nivel_xp: number };
  cosmeticos?: { moedas?: number | null; moedas_xp_blocos?: number | null } | null;
}): number {
  const stored = user.cosmeticos?.moedas;
  if (typeof stored === 'number' && !Number.isNaN(stored)) return stored;
  return Math.floor(Math.max(0, user.gamificacao.nivel_xp) / ABDORIA_XP_STEP);
}

/** Saldo Abdoria após gastar XP na loja (desconta conversão passiva por blocos). */
export function projectedAbdoriaAfterXpSpend(user: UserDocument, xpCost: number): number {
  ensureAbdoriaWallet(user);
  return projectedAbdoriaAfterXpSpendFromState(
    user.gamificacao.nivel_xp,
    readAbdoriaBalance(user),
    user.cosmeticos.moedas_xp_blocos,
    xpCost,
  );
}

export function getDailyXpCapForUser(user: UserDocument): number {
  return dailyXpCapForLevel(xpLevelFromTotal(user.gamificacao.nivel_xp));
}

export function getDailyXpBonusRemaining(user: UserDocument): number {
  resetXpDiarioIfNeeded(user);
  return Math.max(0, user.xp_diario?.bonus_pool_restante ?? 0);
}

export function isDailyXpStandardCapReached(user: UserDocument): boolean {
  resetXpDiarioIfNeeded(user);
  return user.xp_diario.ganho_hoje >= getDailyXpCapForUser(user);
}

export function isDailyXpFullyCapped(user: UserDocument): boolean {
  resetXpDiarioIfNeeded(user);
  const bonusLeft = user.xp_diario?.bonus_pool_restante ?? 0;
  return isDailyXpStandardCapReached(user) && bonusLeft <= 0;
}

function ensureExtraHoje(user: UserDocument): void {
  if (typeof user.xp_diario.extra_hoje !== 'number') {
    user.xp_diario.extra_hoje = 0;
  }
}

function ensureBonusPoolFields(user: UserDocument): void {
  if (typeof user.xp_diario.bonus_pool_restante !== 'number') {
    user.xp_diario.bonus_pool_restante = 0;
  }
  if (typeof user.xp_diario.bonus_pool_total !== 'number') {
    user.xp_diario.bonus_pool_total = 0;
  }
}

/** XP de exercícios — preenche teto padrão primeiro, depois bônus Energy Drink. */
export function awardDailyExerciseXp(user: UserDocument, amount: number): number {
  if (amount <= 0) return 0;
  resetXpDiarioIfNeeded(user);
  ensureExtraHoje(user);
  ensureBonusPoolFields(user);

  const cap = getDailyXpCapForUser(user);
  let remaining = amount;
  let awarded = 0;

  const standardRemaining = cap - user.xp_diario.ganho_hoje;
  if (standardRemaining > 0 && remaining > 0) {
    const fromStandard = Math.min(remaining, standardRemaining);
    user.xp_diario.ganho_hoje += fromStandard;
    awarded += fromStandard;
    remaining -= fromStandard;
  }

  if (remaining > 0 && user.xp_diario.bonus_pool_restante > 0) {
    const fromBonus = Math.min(remaining, user.xp_diario.bonus_pool_restante);
    user.xp_diario.bonus_pool_restante -= fromBonus;
    awarded += fromBonus;
    remaining -= fromBonus;
    if (user.xp_diario.bonus_pool_restante <= 0) {
      user.xp_diario.bonus_pool_total = 0;
    }
  }

  if (awarded > 0) {
    user.gamificacao.nivel_xp += awarded;
  }
  return awarded;
}

/** XP bônus (streak, conquistas, loja, habilidades) — sem teto diário. */
export function awardBonusXp(user: UserDocument, amount: number): number {
  if (amount <= 0) return 0;
  resetXpDiarioIfNeeded(user);
  ensureExtraHoje(user);

  user.xp_diario.extra_hoje += amount;
  user.gamificacao.nivel_xp += amount;
  return amount;
}

/** @deprecated Use awardBonusXp para fontes extras ou awardDailyExerciseXp para exercícios. */
export function awardXp(user: UserDocument, amount: number): number {
  return awardBonusXp(user, amount);
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

export function awardAbdoriaFromXp(user: UserDocument): number {
  ensureAbdoriaWallet(user);
  const blocks = Math.floor(user.gamificacao.nivel_xp / ABDORIA_XP_STEP);
  const previous = user.cosmeticos.moedas_xp_blocos;
  const gained = Math.max(0, blocks - previous);
  if (gained > 0) {
    user.cosmeticos.moedas += gained;
    user.cosmeticos.moedas_xp_blocos = blocks;
  }
  return gained;
}

export function grantAbdoria(user: UserDocument, amount: number): void {
  if (amount <= 0) return;
  ensureAbdoriaWallet(user);
  user.cosmeticos.moedas += amount;
}

export function spendXpForShop(
  user: UserDocument,
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
  ensureAbdoriaWallet(user);
  const newBlocks = Math.floor(nextTotal / ABDORIA_XP_STEP);
  const previousBlocks = user.cosmeticos.moedas_xp_blocos;
  if (newBlocks < previousBlocks) {
    user.cosmeticos.moedas = Math.max(0, user.cosmeticos.moedas - (previousBlocks - newBlocks));
    user.cosmeticos.moedas_xp_blocos = Math.max(newBlocks, Math.floor(floor / ABDORIA_XP_STEP));
  }

  return { spent: amount };
}

export function awardSkillUnlockXp(user: UserDocument, newUnlockCount: number): number {
  if (newUnlockCount <= 0) return 0;
  return awardBonusXp(user, newUnlockCount * XP_PER_SKILL_UNLOCK);
}

export function countNewSkillUnlocks(previous: string[], next: string[]): number {
  const prev = new Set(previous);
  return next.filter((slug) => slug && !prev.has(slug)).length;
}

export {
  dailyXpCapForLevel,
  ABDORIA_XP_STEP,
  streakXpBonus,
  XP_PER_SKILL_UNLOCK,
  XP_STREAK_BONUS_PER_DAY,
  XP_STREAK_BONUS_MAX,
};
