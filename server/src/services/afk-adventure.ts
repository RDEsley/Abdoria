import type { UserRecord } from '../domain/User.js';
import {
  AFK_REGIONS,
  canUnlockAfkSkill,
  getAfkRegionById,
  getAfkSkillNode,
  getEnemyMaxHp,
  getNextAfkRegion,
  type AfkRegionId,
} from '../types/index.js';
import { ensureMoedaWallet, readMoedaBalance } from './economy.js';
import { ensureCombat } from './afk-combat.js';
import { resumeAfk, syncAfkRewards } from './afk.js';

export function startAfkAdventure(user: UserRecord): void {
  const combat = ensureCombat(user);
  combat.adventure_started = true;
  combat.intro_seen = true;
  combat.story_flags = [...new Set([...(combat.story_flags ?? []), 'village_intro'])];
  resumeAfk(user);
}

export function selectAfkRegion(
  user: UserRecord,
  regionId: string,
): { ok: true } | { ok: false; error: string } {
  const region = AFK_REGIONS.find((entry) => entry.id === regionId);
  if (!region) return { ok: false, error: 'Região desconhecida.' };

  // A sincronização normaliza e substitui `user.afk.combat`. Sempre obtenha a
  // referência mutável depois dela; caso contrário a viagem é escrita em um
  // objeto obsoleto e parece funcionar sem persistir a nova região.
  syncAfkRewards(user);
  const combat = ensureCombat(user);
  if (!(combat.unlocked_regions ?? []).includes(region.id)) {
    return { ok: false, error: 'Derrote o guardião anterior para liberar esta região.' };
  }
  combat.region_id = region.id;
  const progress = combat.region_progress?.[region.id];
  combat.kills_until_boss = progress?.kills_until_boss ?? 0;
  combat.enemy_id = region.commonEnemies[0]!;
  combat.enemy_hp = getEnemyMaxHp(combat.enemy_id, region.chapter);
  combat.is_boss = false;
  combat.elite = false;
  combat.search_remaining_ms = 1_200;
  combat.hero_attack_remaining_ms = 350;
  combat.enemy_attack_remaining_ms = 10_000;
  resumeAfk(user);
  return { ok: true };
}

export function advanceAfkChapter(
  user: UserRecord,
):
  | { ok: true; story: { title: string; body: string }; region_id: AfkRegionId }
  | { ok: false; error: string } {
  syncAfkRewards(user);
  const combat = ensureCombat(user);
  const current = getAfkRegionById(combat.region_id);
  const progress = combat.region_progress?.[current.id];
  if (!progress?.boss_defeated) {
    return { ok: false, error: 'Derrote o guardião desta região antes de avançar.' };
  }
  const next = getNextAfkRegion(current.id);
  if (!next) return { ok: false, error: 'Você já alcançou o último capítulo.' };
  if ((combat.unlocked_regions ?? []).includes(next.id)) {
    return { ok: false, error: 'Este caminho já foi liberado. Escolha a região pelo mapa.' };
  }

  const unlocked = new Set(combat.unlocked_regions ?? ['verdant-trail']);
  unlocked.add(next.id);
  combat.unlocked_regions = AFK_REGIONS.filter((region) => unlocked.has(region.id)).map(
    (region) => region.id,
  );
  combat.story_flags = [
    ...new Set([...(combat.story_flags ?? []), `chapter_${current.chapter}_clear`]),
  ];
  selectAfkRegion(user, next.id);
  return {
    ok: true,
    story: { title: current.storyTitle, body: current.story },
    region_id: next.id,
  };
}

export function unlockAfkSkill(
  user: UserRecord,
  nodeId: string,
): { ok: true } | { ok: false; error: string } {
  const combat = ensureCombat(user);
  const node = getAfkSkillNode(nodeId);
  const unlocked = combat.skill_nodes ?? [];
  if (!node) return { ok: false, error: 'Habilidade desconhecida.' };
  if (!canUnlockAfkSkill(unlocked, node.id)) {
    return { ok: false, error: 'Desbloqueie as habilidades anteriores primeiro.' };
  }
  if ((combat.orbs ?? 0) < node.cost) {
    return { ok: false, error: `Você precisa de ${node.cost} orbe${node.cost === 1 ? '' : 's'}.` };
  }
  combat.orbs = (combat.orbs ?? 0) - node.cost;
  combat.skill_nodes = [...unlocked, node.id];
  return { ok: true };
}

export function resetAfkSkillTree(
  user: UserRecord,
  currency: 'coins' | 'gems',
): { ok: true; payment: 'free' | 'coins' | 'gems' } | { ok: false; error: string } {
  const combat = ensureCombat(user);
  if ((combat.skill_nodes?.length ?? 0) === 0) {
    return { ok: false, error: 'A árvore ainda não possui habilidades para resetar.' };
  }
  const isFreeReset = !combat.skill_tree_free_reset_used;
  if (!isFreeReset && currency === 'gems') {
    if ((user.gems ?? 0) < 1) return { ok: false, error: 'Gemas insuficientes.' };
    user.gems = (user.gems ?? 0) - 1;
  } else if (!isFreeReset) {
    ensureMoedaWallet(user);
    if (readMoedaBalance(user) < 5_000) return { ok: false, error: 'Coins insuficientes.' };
    user.cosmeticos.moedas -= 5_000;
  }

  const spent = (combat.skill_nodes ?? []).reduce(
    (total, nodeId) => total + (getAfkSkillNode(nodeId)?.cost ?? 0),
    0,
  );
  combat.orbs = (combat.orbs ?? 0) + spent;
  combat.skill_nodes = [];
  combat.skill_tree_free_reset_used = true;
  return { ok: true, payment: isFreeReset ? 'free' : currency };
}

export function markAfkStoryFlag(user: UserRecord, flag: string): void {
  const combat = ensureCombat(user);
  const safeFlag = flag.slice(0, 80);
  combat.story_flags = [...new Set([...(combat.story_flags ?? []), safeFlag])];
  if (safeFlag === 'village_intro') combat.intro_seen = true;
}
