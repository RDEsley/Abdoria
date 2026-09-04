import { User } from '../domain/User.js';
import { DEFAULT_COSMETICOS } from '../types/index.js';

const leaderboardFilter = {
  onboarding_completed: true,
  is_guest: false,
  is_demo_npc: false,
};

/** Enquanto uma sync está em voo, chamadas concorrentes reaproveitam a mesma promise. */
let inFlight: Promise<void> | null = null;

/**
 * Garante `moedas_total_ganhas` coerente para o ranking global de Folhas.
 * NPCs/demo não entram mais no sync.
 */
export async function syncMoedaBalancesForLeaderboard(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = doSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doSync(): Promise<void> {
  const users = await User.find(leaderboardFilter);

  const updates = users.flatMap((lean) => {
    const saldoAtual = lean.cosmeticos?.moedas ?? 0;
    const totalAtual = lean.cosmeticos?.moedas_total_ganhas;
    const totalGanhas = Math.max(
      saldoAtual,
      typeof totalAtual === 'number' && !Number.isNaN(totalAtual) ? totalAtual : 0,
    );

    if (totalGanhas === totalAtual) return [];

    const cosmeticos = {
      ...(lean.cosmeticos ?? DEFAULT_COSMETICOS),
      moedas: saldoAtual,
      moedas_total_ganhas: totalGanhas,
    };
    return [User.updateFieldsById(lean.id, { cosmeticos })];
  });

  if (updates.length > 0) await Promise.all(updates);
}
