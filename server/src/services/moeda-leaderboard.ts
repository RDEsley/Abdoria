import { User } from '../domain/User.js';
import { MOEDA_XP_STEP, DEFAULT_COSMETICOS } from '../types/index.js';

const leaderboardFilter = {
  onboarding_completed: true,
  is_guest: { $ne: true },
};

function npcMoedasBonus(nivelXp: number): number {
  return Math.floor(nivelXp / MOEDA_XP_STEP) + 12;
}

/** Enquanto uma sync está em voo, chamadas concorrentes (ex.: `GET /` e
    `GET /me` do ranking disparados juntos pelo client) reaproveitam a MESMA
    promise em vez de rodar a varredura duas vezes ao mesmo tempo. */
let inFlight: Promise<void> | null = null;

/**
 * Garante que os NPCs demo tenham o saldo de Coins alvo pra aparecerem
 * corretamente no ranking. Antes fazia um `findById` + `save()` completo
 * (2-4 idas ao banco) por usuário, SEMPRE — inclusive pra quem já estava
 * em dia — virando uma varredura sequencial de centenas de round-trips com
 * ~100 NPCs seedados (era a causa principal do ranking travar/estourar
 * timeout). Agora o alvo é calculado direto dos dados já carregados pelo
 * `find()` (sem round-trip extra por usuário) e só os NPCs REALMENTE
 * desatualizados recebem um update — em paralelo, um só round trip cada.
 */
export async function syncMoedaBalancesForLeaderboard(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = doSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doSync(): Promise<void> {
  const users = await User.find(leaderboardFilter, { skipAfk: true });

  const updates = users.flatMap((lean) => {
    if (!lean.is_demo_npc) return [];
    const target = npcMoedasBonus(lean.gamificacao.nivel_xp);
    const atual = lean.cosmeticos?.moedas ?? 0;
    if (atual >= target) return [];
    const cosmeticos = {
      ...(lean.cosmeticos ?? DEFAULT_COSMETICOS),
      moedas: target,
      moedas_xp_blocos: Math.floor(lean.gamificacao.nivel_xp / MOEDA_XP_STEP),
    };
    return [User.updateFieldsById(lean.id, { cosmeticos })];
  });

  if (updates.length > 0) await Promise.all(updates);
}

export function buildNpcCosmeticos(nivelXp: number) {
  const blocks = Math.floor(nivelXp / MOEDA_XP_STEP);
  return {
    ...DEFAULT_COSMETICOS,
    moedas: blocks + 12,
    moedas_xp_blocos: blocks,
  };
}
