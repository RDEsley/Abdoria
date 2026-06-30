import type { AfkEnemyId } from './combat.js';

export type SlimeEyeStyle = 'round' | 'happy' | 'sleepy' | 'wide' | 'star' | 'anime';
export type SlimeMouthStyle = 'smile' | 'o' | 'cat' | 'grin' | 'flat' | 'vampire';
export type SlimeExtraAccessory =
  | 'none'
  | 'aura'
  | 'glasses'
  | 'leaf'
  | 'beanie'
  | 'flower'
  | 'halo'
  | 'bow'
  | 'patch'
  | 'sparkle';

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
  | 'scar'
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
  | 'storm-bolt';

export interface SlimeAppearance {
  eyes: SlimeEyeStyle;
  mouth: SlimeMouthStyle;
  extra: SlimeExtraAccessory;
}

const EYE_STYLES: SlimeEyeStyle[] = ['round', 'happy', 'sleepy', 'wide', 'star', 'anime'];
const MOUTH_STYLES: SlimeMouthStyle[] = ['smile', 'o', 'cat', 'grin', 'flat', 'vampire'];
const EXTRA_POOL: SlimeExtraAccessory[] = [
  'aura',
  'glasses',
  'leaf',
  'beanie',
  'flower',
  'halo',
  'bow',
  'patch',
  'sparkle',
];

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

export function resolveSlimeAppearance(
  seed: number,
  enemyId: AfkEnemyId,
  isBoss: boolean,
  elite: boolean,
): SlimeAppearance {
  const s = seed >>> 0;

  if (isBoss && enemyId === 'boss_colossus') {
    return { eyes: 'wide', mouth: 'grin', extra: 'none' };
  }
  if (isBoss && enemyId === 'boss_lich') {
    return { eyes: 'sleepy', mouth: 'flat', extra: 'none' };
  }
  if (isBoss && enemyId === 'boss_hydra') {
    return { eyes: 'wide', mouth: 'grin', extra: 'none' };
  }
  if (isBoss && enemyId === 'boss_golem') {
    return { eyes: 'wide', mouth: 'grin', extra: 'none' };
  }
  if (enemyId === 'golden_slime') {
    return { eyes: 'star', mouth: 'o', extra: 'aura' };
  }
  if (enemyId === 'magic_rabbit') {
    return { eyes: 'star', mouth: 'smile', extra: 'sparkle' };
  }
  if (enemyId === 'skeleton') {
    return { eyes: 'round', mouth: 'flat', extra: 'none' };
  }
  if (enemyId === 'armored_skeleton') {
    return { eyes: 'round', mouth: 'flat', extra: 'none' };
  }

  let eyes = EYE_STYLES[s % EYE_STYLES.length]!;
  let mouth = MOUTH_STYLES[(s >>> 8) % MOUTH_STYLES.length]!;

  if (enemyId === 'zombie' && (s >>> 10) % 3 === 0) {
    mouth = 'vampire';
  }
  if (enemyId === 'crystal_slime' && (s >>> 14) % 4 === 0) {
    eyes = 'wide';
  }
  if (enemyId === 'storm_slime' && (s >>> 14) % 3 === 0) {
    eyes = 'anime';
  }
  const extraRoll = (s >>> 16) % 100;

  let extra: SlimeExtraAccessory = 'none';
  if (!isBoss && (elite || extraRoll < 32)) {
    extra = EXTRA_POOL[(s >>> 24) % EXTRA_POOL.length]!;
  }

  return { eyes, mouth, extra };
}

export function resolvePortraitAppearance(enemyId: AfkEnemyId): SlimeAppearance {
  switch (enemyId) {
    case 'bat':
      return { eyes: 'round', mouth: 'smile', extra: 'none' };
    case 'zombie':
      return { eyes: 'sleepy', mouth: 'vampire', extra: 'none' };
    case 'skeleton':
      return { eyes: 'round', mouth: 'flat', extra: 'none' };
    case 'armored_skeleton':
      return { eyes: 'round', mouth: 'flat', extra: 'none' };
    case 'crystal_slime':
      return { eyes: 'wide', mouth: 'flat', extra: 'none' };
    case 'storm_slime':
      return { eyes: 'anime', mouth: 'grin', extra: 'none' };
    case 'slime_knight':
      return { eyes: 'round', mouth: 'smile', extra: 'none' };
    case 'golden_slime':
      return { eyes: 'star', mouth: 'o', extra: 'aura' };
    case 'magic_rabbit':
      return { eyes: 'star', mouth: 'smile', extra: 'sparkle' };
    case 'boss_colossus':
      return { eyes: 'wide', mouth: 'grin', extra: 'none' };
    case 'boss_lich':
      return { eyes: 'sleepy', mouth: 'flat', extra: 'none' };
    case 'boss_hydra':
      return { eyes: 'wide', mouth: 'grin', extra: 'none' };
    case 'boss_golem':
      return { eyes: 'wide', mouth: 'grin', extra: 'none' };
    default:
      return { eyes: 'round', mouth: 'smile', extra: 'none' };
  }
}

export function collectSlimeAccessories(
  enemyId: AfkEnemyId,
  isBoss: boolean,
  elite: boolean,
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
      case 'boss_hydra':
        break;
      case 'boss_golem':
        items.push('crown', 'horn-l', 'horn-r');
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
      items.push('scar');
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
    default:
      if (elite) items.push('cap');
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
