import type { AfkEnemyId } from './combat.js';

export type SlimeEyeStyle = 'round' | 'happy' | 'sleepy' | 'wide' | 'star' | 'anime';
export type SlimeMouthStyle = 'smile' | 'o' | 'cat' | 'grin' | 'flat' | 'vampire';
export type SlimeExtraAccessory =
  'none' | 'aura' | 'glasses' | 'leaf' | 'beanie' | 'flower' | 'halo' | 'bow' | 'patch' | 'sparkle';

export type SlimeAccessoryKind =
  | 'crown'
  | 'hood'
  | 'staff'
  | 'mini-l'
  | 'mini-c'
  | 'mini-r'
  | 'wing-l'
  | 'wing-r'
  | 'horn'
  | 'horn-l'
  | 'horn-r'
  | 'ear-l'
  | 'ear-r'
  | 'bone-a'
  | 'bone-b'
  | 'skull'
  | 'helm'
  | 'helm-knight'
  | 'cap'
  | 'aura'
  | 'glasses'
  | 'leaf'
  | 'beanie'
  | 'flower'
  | 'halo'
  | 'bow'
  | 'patch'
  | 'sparkle'
  | 'wizard-hat'
  | 'wand'
  | 'crystal-shard'
  | 'storm-bolt'
  | 'cowboy-hat'
  | 'party-hat'
  | 'bandana'
  | 'headphones'
  | 'antenna'
  | 'antennae'
  | 'monocle'
  | 'scarf';

export interface SlimeAppearance {
  eyes: SlimeEyeStyle;
  mouth: SlimeMouthStyle;
  extra: SlimeExtraAccessory;
}

const EXTRA_TO_KIND: Record<Exclude<SlimeExtraAccessory, 'none'>, SlimeAccessoryKind> = {
  aura: 'aura',
  glasses: 'glasses',
  leaf: 'leaf',
  beanie: 'beanie',
  flower: 'flower',
  halo: 'halo',
  bow: 'bow',
  patch: 'patch',
  sparkle: 'sparkle',
};

/**
 * Cosméticos sorteados por spawn — só em comuns e elites (boss nunca, pra não
 * competir com a coroa/capuz que é identidade do chefe). São puramente
 * visuais: não mudam HP, dano nem loot.
 */
export const SLIME_COSMETIC_POOL: SlimeAccessoryKind[] = [
  'cowboy-hat',
  'party-hat',
  'bandana',
  'headphones',
  'cap',
  'beanie',
  'antenna',
  'antennae',
  'flower',
  'bow',
  'scarf',
  'halo',
];

/** Chance (%) de um spawn comum/elite vir com um cosmético sorteado. */
export const SLIME_COSMETIC_CHANCE = 38;

/** Ocupam o topo da cabeça — só cabe um por slime. */
const HEAD_SLOT: ReadonlySet<SlimeAccessoryKind> = new Set([
  'crown',
  'hood',
  'helm',
  'helm-knight',
  'wizard-hat',
  'cap',
  'beanie',
  'cowboy-hat',
  'party-hat',
  'bandana',
  'headphones',
  'antenna',
  'antennae',
  'halo',
]);

/** Ficam sobre o rosto — só cabe um por slime. */
const FACE_SLOT: ReadonlySet<SlimeAccessoryKind> = new Set(['glasses', 'monocle', 'patch']);

/**
 * Sorteia um cosmético pro spawn, respeitando os slots já ocupados pelos
 * acessórios de identidade da criatura (ex.: o Blindado já usa o topo com o
 * elmo, então nunca ganha chapéu por cima — sobra óculos, cachecol e afins).
 */
export function rollSlimeCosmetic(
  seed: number,
  isBoss: boolean,
  identity: SlimeAccessoryKind[],
): SlimeAccessoryKind | null {
  if (isBoss) return null;

  const s = seed >>> 0;
  if ((s >>> 16) % 100 >= SLIME_COSMETIC_CHANCE) return null;

  const headTaken = identity.some((kind) => HEAD_SLOT.has(kind));
  const faceTaken = identity.some((kind) => FACE_SLOT.has(kind));

  const pool = SLIME_COSMETIC_POOL.filter((kind) => {
    if (identity.includes(kind)) return false;
    if (headTaken && HEAD_SLOT.has(kind)) return false;
    if (faceTaken && FACE_SLOT.has(kind)) return false;
    return true;
  });
  if (pool.length === 0) return null;

  return pool[(s >>> 24) % pool.length]!;
}

export function resolvePortraitAppearance(enemyId: AfkEnemyId): SlimeAppearance {
  switch (enemyId) {
    case 'bat':
      return { eyes: 'round', mouth: 'smile', extra: 'none' };
    case 'zombie':
      return { eyes: 'sleepy', mouth: 'smile', extra: 'none' };
    case 'skeleton':
      return { eyes: 'round', mouth: 'flat', extra: 'none' };
    case 'slime_macaco':
      return { eyes: 'round', mouth: 'grin', extra: 'none' };
    case 'slime_agua':
      return { eyes: 'wide', mouth: 'o', extra: 'none' };
    case 'slime_doce':
      return { eyes: 'happy', mouth: 'smile', extra: 'none' };
    case 'slime_chocolate':
      return { eyes: 'happy', mouth: 'cat', extra: 'none' };
    case 'sand_slime':
      return { eyes: 'round', mouth: 'flat', extra: 'none' };
    case 'lich_slime':
      return { eyes: 'sleepy', mouth: 'vampire', extra: 'none' };
    case 'stone_slime':
      return { eyes: 'wide', mouth: 'flat', extra: 'none' };
    case 'clock_slime':
      return { eyes: 'anime', mouth: 'o', extra: 'none' };
    case 'sleepy_slime':
      return { eyes: 'sleepy', mouth: 'flat', extra: 'none' };
    case 'dream_slime':
      return { eyes: 'star', mouth: 'smile', extra: 'sparkle' };
    case 'armored_skeleton':
      return { eyes: 'round', mouth: 'flat', extra: 'none' };
    case 'crystal_slime':
      return { eyes: 'wide', mouth: 'flat', extra: 'none' };
    case 'storm_slime':
      return { eyes: 'anime', mouth: 'grin', extra: 'none' };
    case 'slime_knight':
      return { eyes: 'round', mouth: 'smile', extra: 'none' };
    case 'slime_chumbo':
      return { eyes: 'sleepy', mouth: 'flat', extra: 'none' };
    case 'dune_brute':
      return { eyes: 'wide', mouth: 'grin', extra: 'none' };
    case 'necro_slime':
      return { eyes: 'anime', mouth: 'vampire', extra: 'none' };
    case 'stone_guardian':
      return { eyes: 'wide', mouth: 'flat', extra: 'none' };
    case 'chronos_slime':
      return { eyes: 'star', mouth: 'flat', extra: 'none' };
    case 'nightmare_slime':
      return { eyes: 'sleepy', mouth: 'vampire', extra: 'none' };
    case 'golden_slime':
      return { eyes: 'star', mouth: 'o', extra: 'aura' };
    case 'magic_rabbit':
      return { eyes: 'star', mouth: 'smile', extra: 'sparkle' };
    case 'slime_enigma':
    case 'slime_binario':
      return { eyes: 'round', mouth: 'flat', extra: 'none' };
    case 'boss_colossus':
      return { eyes: 'wide', mouth: 'grin', extra: 'none' };
    case 'boss_crocodile':
      return { eyes: 'wide', mouth: 'vampire', extra: 'none' };
    case 'boss_lich':
      return { eyes: 'sleepy', mouth: 'flat', extra: 'none' };
    case 'boss_hydra':
      return { eyes: 'wide', mouth: 'grin', extra: 'none' };
    case 'boss_golem':
      return { eyes: 'wide', mouth: 'grin', extra: 'none' };
    case 'boss_procrastinador':
      return { eyes: 'sleepy', mouth: 'flat', extra: 'none' };
    case 'boss_preguica':
      return { eyes: 'sleepy', mouth: 'o', extra: 'none' };
    default:
      return { eyes: 'round', mouth: 'smile', extra: 'none' };
  }
}

/**
 * Acessórios de IDENTIDADE da criatura (asas do Morcego, orelhas do Macaco,
 * ossos do Esqueleto, coroa do chefe...) — fixos, aparecem no combate e no
 * Bestiário. Cosmético sorteado por spawn é outra coisa: ver
 * {@link rollSlimeCosmetic}.
 */
export function collectSlimeAccessories(
  enemyId: AfkEnemyId,
  isBoss: boolean,
  appearance: SlimeAppearance,
): SlimeAccessoryKind[] {
  const items: SlimeAccessoryKind[] = [];

  if (isBoss) {
    switch (enemyId) {
      case 'boss_colossus':
        items.push('crown', 'horn-l', 'horn-r');
        break;
      case 'boss_lich':
        items.push('hood', 'staff');
        break;
      case 'boss_crocodile':
        items.push('crown', 'horn-l', 'horn-r');
        break;
      case 'boss_hydra':
        break;
      case 'boss_golem':
        items.push('crown', 'horn-l', 'horn-r');
        break;
      case 'boss_procrastinador':
        items.push('cap', 'headphones');
        break;
      case 'boss_preguica':
        items.push('beanie', 'halo');
        break;
      default:
        items.push('crown');
    }
    return items;
  }

  if (enemyId === 'golden_slime') {
    items.push('aura');
    return items;
  }

  if (enemyId === 'magic_rabbit') {
    items.push('wizard-hat', 'wand');
    return items;
  }

  switch (enemyId) {
    case 'bat':
      items.push('wing-l', 'wing-r');
      break;
    case 'zombie':
      items.push('leaf');
      break;
    case 'slime_macaco':
      items.push('ear-l', 'ear-r');
      break;
    case 'skeleton':
      items.push('bone-a', 'bone-b');
      break;
    case 'armored_skeleton':
      items.push('bone-a', 'bone-b', 'helm');
      break;
    case 'crystal_slime':
      items.push('crystal-shard');
      break;
    case 'storm_slime':
      items.push('storm-bolt');
      break;
    case 'slime_knight':
      items.push('helm-knight');
      break;
    case 'sand_slime':
      items.push('bandana');
      break;
    case 'lich_slime':
      items.push('wizard-hat');
      break;
    case 'stone_slime':
      items.push('helm');
      break;
    case 'clock_slime':
      items.push('monocle');
      break;
    case 'sleepy_slime':
      items.push('beanie');
      break;
    case 'dream_slime':
      items.push('halo');
      break;
    case 'dune_brute':
      items.push('cowboy-hat', 'horn-l', 'horn-r');
      break;
    case 'necro_slime':
      items.push('hood', 'wand');
      break;
    case 'stone_guardian':
      items.push('helm-knight');
      break;
    case 'chronos_slime':
      items.push('monocle', 'antennae');
      break;
    case 'nightmare_slime':
      items.push('horn-l', 'horn-r', 'aura');
      break;
    default:
      break;
  }

  if (appearance.extra !== 'none') {
    const kind = EXTRA_TO_KIND[appearance.extra];
    if (!items.includes(kind)) items.push(kind);
  }

  return items;
}

export function accessoryDropMotion(
  seed: number,
  index: number,
): { x: number; y: number; rot: number } {
  const s = (seed >>> 0) + index * 97;
  // Espalhamento horizontal maior, impulso vertical mais forte e giro (tumble) amplo
  // para a peça cair com sensação de gravidade/física natural.
  const x = ((s % 23) - 11) * 4; // ~ -44..44 px
  const y = -(((s >>> 5) % 13) + 16); // pop inicial -16..-28 px
  const rot = ((s >>> 8) % 280) - 140; // tumble -140..140 graus
  return { x, y, rot };
}
