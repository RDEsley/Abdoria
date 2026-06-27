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
  | 'scar'
  | 'bone-a'
  | 'bone-b'
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
  | 'sparkle';

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
  if (enemyId === 'golden_slime') {
    return { eyes: 'star', mouth: 'o', extra: 'aura' };
  }

  let eyes = EYE_STYLES[s % EYE_STYLES.length]!;
  let mouth = MOUTH_STYLES[(s >>> 8) % MOUTH_STYLES.length]!;

  if (enemyId === 'zombie' && (s >>> 10) % 3 === 0) {
    mouth = 'vampire';
  }
  if (enemyId === 'demon_bat' && (s >>> 14) % 4 === 0) {
    eyes = 'anime';
  }
  const extraRoll = (s >>> 16) % 100;

  let extra: SlimeExtraAccessory = 'none';
  if (!isBoss && (elite || extraRoll < 32)) {
    extra = EXTRA_POOL[(s >>> 24) % EXTRA_POOL.length]!;
  }

  return { eyes, mouth, extra };
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
        items.push('crown');
        break;
      case 'boss_lich':
        items.push('hood', 'staff');
        break;
      case 'boss_hydra':
        items.push('mini-l', 'mini-c', 'mini-r');
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

  switch (enemyId) {
    case 'bat':
    case 'demon_bat':
      items.push('wing-l', 'wing-r');
      if (enemyId === 'demon_bat') items.push('horn');
      break;
    case 'zombie':
      items.push('scar');
      break;
    case 'skeleton':
    case 'armored_skeleton':
      items.push('bone-a', 'bone-b');
      if (enemyId === 'armored_skeleton') items.push('helm');
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
  const x = ((s % 19) - 9) * 3;
  const y = -(((s >>> 5) % 11) + 10);
  const rot = ((s >>> 8) % 72) - 36;
  return { x, y, rot };
}
