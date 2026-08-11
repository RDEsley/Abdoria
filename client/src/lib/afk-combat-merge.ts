import type { AfkCombatSnapshot } from '@/types';

/** Preserva animação local do combate, mas sempre aplica dano de armas do servidor. */
export function mergeAfkCombatSnapshot(
  local: AfkCombatSnapshot | null | undefined,
  server: AfkCombatSnapshot,
): AfkCombatSnapshot {
  if (!local) return server;
  // Viajar não aumenta o total global de abates. Mesmo assim, todos os dados
  // do encontro precisam vir da nova região (inimigo, HP e contador próprio).
  if (server.region_id !== local.region_id) return server;
  if (server.kills_total > local.kills_total) return server;
  return {
    ...local,
    region_id: server.region_id,
    region_progress: server.region_progress,
    unlocked_regions: server.unlocked_regions,
    // HP e nocaute são persistidos a cada golpe inimigo. Sempre aceitar a
    // versão autoritativa impede o estado impossível `0 HP` sem contador de
    // recuperação depois de uma vitória ou de um modal aberto/fechado.
    hero_hp: server.hero_hp,
    hero_max_hp: server.hero_max_hp,
    hero_defeated_until: server.hero_defeated_until,
    defeated_remaining_ms: server.defeated_remaining_ms,
    orbs: server.orbs,
    skill_nodes: server.skill_nodes,
    skill_tree_free_reset_used: server.skill_tree_free_reset_used,
    adventure_started: server.adventure_started,
    slime_language_unlocked: server.slime_language_unlocked,
    intro_seen: server.intro_seen,
    story_flags: server.story_flags,
    hero_damage_arco: server.hero_damage_arco,
    hero_damage_espada: server.hero_damage_espada,
  };
}
