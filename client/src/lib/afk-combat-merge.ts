import type { AfkCombatSnapshot } from '@/types';

/** Preserva animação local do combate, mas sempre aplica dano de armas do servidor. */
export function mergeAfkCombatSnapshot(
  local: AfkCombatSnapshot | null | undefined,
  server: AfkCombatSnapshot,
): AfkCombatSnapshot {
  if (!local) return server;
  if (server.kills_total > local.kills_total) return server;
  return {
    ...local,
    hero_damage_arco: server.hero_damage_arco,
    hero_damage_espada: server.hero_damage_espada,
  };
}
