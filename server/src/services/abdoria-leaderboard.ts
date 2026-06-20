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

export async function syncAbdoriaBalancesForLeaderboard(): Promise<void> {
  const users = await User.find(leaderboardFilter);

  for (const lean of users) {
    const user = await User.findById(lean._id);
    if (!user) continue;

    ensureAbdoriaWallet(user);
    awardAbdoriaFromXp(user);

    let dirty = false;
    if (user.is_demo_npc) {
      const target = npcMoedasBonus(user.gamificacao.nivel_xp);
      if (user.cosmeticos.moedas < target) {
        user.cosmeticos.moedas = target;
        user.cosmeticos.moedas_xp_blocos = Math.floor(user.gamificacao.nivel_xp / ABDORIA_XP_STEP);
        dirty = true;
      }
    }

    if (dirty) await user.save();
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
