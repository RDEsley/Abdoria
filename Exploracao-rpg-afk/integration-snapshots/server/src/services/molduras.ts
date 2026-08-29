import type { UserRecord } from '../domain/User.js';
import type { MolduraId } from '../types/index.js';
import { COSMETIC_BY_ID } from '../data/cosmetics.js';
import { PATROL_SECRET_WEAPON_IDS, resolvePatrolArmas } from '../types/index.js';
import { LeaderboardPodiumHistory } from '../repositories/leaderboard-podium-repository.js';

export interface MolduraStatus {
  /** Vezes que fechou a semana em 1º/2º/3º (todas as métricas). */
  first: number;
  second: number;
  third: number;
  /** Itens secretos possuídos (cosméticos secretos + armas Secret). */
  secret_items: number;
  desbloqueadas: MolduraId[];
  equipada: MolduraId | null;
}

/** Conta itens secretos do usuário (cosméticos de raridade secreto + armas Secret). */
export function countSecretItems(user: UserRecord): number {
  const unlockedCosmetics = user.cosmeticos?.desbloqueados ?? [];
  const secretCosmetics = unlockedCosmetics.filter(
    (id) => COSMETIC_BY_ID[id]?.raridade === 'secreto',
  ).length;

  const armas = resolvePatrolArmas(user.preferencias?.patrol_armas);
  const secretWeapons = PATROL_SECRET_WEAPON_IDS.filter((id) =>
    armas.desbloqueados.includes(id),
  ).length;

  return secretCosmetics + secretWeapons;
}

export async function molduraStatusForUser(user: UserRecord): Promise<MolduraStatus> {
  const counts = await LeaderboardPodiumHistory.countsForUser(user.id);
  const secretItems = countSecretItems(user);

  const desbloqueadas: MolduraId[] = [];
  if (counts.third > 0) desbloqueadas.push('bronze');
  if (counts.second > 0) desbloqueadas.push('prata');
  if (counts.first > 0) desbloqueadas.push('ouro');
  if (secretItems > 0) desbloqueadas.push('especial');

  const equipada = user.cosmeticos?.moldura_equipada ?? null;

  return {
    first: counts.first,
    second: counts.second,
    third: counts.third,
    secret_items: secretItems,
    desbloqueadas,
    equipada: equipada && desbloqueadas.includes(equipada) ? equipada : null,
  };
}

/** Contador sobreposto à moldura (quantas vezes conquistou aquela posição/segredo). */
export function molduraCount(status: MolduraStatus, moldura: MolduraId): number {
  if (moldura === 'ouro') return status.first;
  if (moldura === 'prata') return status.second;
  if (moldura === 'bronze') return status.third;
  return status.secret_items;
}
