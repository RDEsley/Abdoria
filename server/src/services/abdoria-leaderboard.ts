import { User } from '../models/User.js';
import { ABDORIA_XP_STEP, DEFAULT_COSMETICOS } from '../types/index.js';
import { awardAbdoriaFromXp, ensureAbdoriaWallet } from './economy.js';

const leaderboardFilter = {
  onboarding_completed: true,
  is_guest: { $ne: true },
};

function npcMoedasBonus(nivelXp: number): number {
  return Math.floor(nivelXp / ABDORIA_XP_STEP) + 12;
}

/** Corrige saldos Abdoria ausentes ou inválidos antes do ranking por moedas. */
export async function syncAbdoriaBalancesForLeaderboard(): Promise<void> {
  const users = await User.find(leaderboardFilter);

  for (const user of users) {
    ensureAbdoriaWallet(user);
    awardAbdoriaFromXp(user);

    if (user.is_demo_npc) {
      const target = npcMoedasBonus(user.gamificacao.nivel_xp);
      if (user.cosmeticos.moedas < target) {
        user.cosmeticos.moedas = target;
        user.cosmeticos.moedas_xp_blocos = Math.floor(user.gamificacao.nivel_xp / ABDORIA_XP_STEP);
      }
    }

    if (user.isModified('cosmeticos')) {
      await user.save();
    }
  }
}

export function buildNpcCosmeticos(nivelXp: number) {
  const blocks = Math.floor(nivelXp / ABDORIA_XP_STEP);
  return {
    ...DEFAULT_COSMETICOS,
    moedas: blocks + 12,
    moedas_xp_blocos: blocks,
  };
}
