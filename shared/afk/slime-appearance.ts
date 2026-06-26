import type { AfkEnemyId } from './combat.js';

export type SlimeEyeStyle = 'round' | 'happy' | 'sleepy' | 'wide' | 'star';
export type SlimeMouthStyle = 'smile' | 'o' | 'cat' | 'grin' | 'flat';
export type SlimeExtraAccessory = 'none' | 'aura' | 'glasses' | 'leaf' | 'beanie' | 'flower';

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
  | 'flower';

export interface SlimeAppearance {
  eyes: SlimeEyeStyle;
  mouth: SlimeMouthStyle;
  extra: SlimeExtraAccessory;
}

const EYE_STYLES: SlimeEyeStyle[] = ['round', 'happy', 'sleepy', 'wide', 'star'];
const MOUTH_STYLES: SlimeMouthStyle[] = ['smile', 'o', 'cat', 'grin', 'flat'];
const EXTRA_POOL: SlimeExtraAccessory[] = ['aura', 'glasses', 'leaf', 'beanie', 'flower'];

const EXTRA_TO_KIND: Record<Exclude<SlimeExtraAccessory, 'none'>, SlimeAccessoryKind> = {
  aura: 'aura',
  glasses: 'glasses',
  leaf: 'leaf',
  beanie: 'beanie',
  flower: 'flower',
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

  const eyes = EYE_STYLES[s % EYE_STYLES.length]!;
  const mouth = MOUTH_STYLES[(s >>> 8) % MOUTH_STYLES.length]!;
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

export function accessoryDropMotion(seed: number, index: number): { x: number; rot: number } {
  const s = (seed >>> 0) + index * 97;
  const x = ((s % 17) - 8) * 2;
  const rot = ((s >>> 8) % 50) - 25;
  return { x, rot };
}
