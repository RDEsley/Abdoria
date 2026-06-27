import type { CSSProperties } from 'react';
import type { SlimeAccessoryKind } from '@/types';

const KIND_CLASS: Record<SlimeAccessoryKind, string> = {
  crown: 'game-afk-slime__crown',
  hood: 'game-afk-slime__hood',
  staff: 'game-afk-slime__staff',
  'mini-l': 'game-afk-slime__mini-head game-afk-slime__mini-head--l',
  'mini-c': 'game-afk-slime__mini-head game-afk-slime__mini-head--c',
  'mini-r': 'game-afk-slime__mini-head game-afk-slime__mini-head--r',
  'wing-l': 'game-afk-slime__wing game-afk-slime__wing--l',
  'wing-r': 'game-afk-slime__wing game-afk-slime__wing--r',
  horn: 'game-afk-slime__horn',
  'horn-l': 'game-afk-slime__horn game-afk-slime__horn--l',
  'horn-r': 'game-afk-slime__horn game-afk-slime__horn--r',
  scar: 'game-afk-slime__scar',
  'bone-a': 'game-afk-slime__bone game-afk-slime__bone--a',
  'bone-b': 'game-afk-slime__bone game-afk-slime__bone--b',
  skull: 'game-afk-slime__skull',
  helm: 'game-afk-slime__helm',
  'helm-knight': 'game-afk-slime__helm game-afk-slime__helm--knight',
  cap: 'game-afk-slime__cap',
  aura: 'game-afk-slime__aura',
  glasses: 'game-afk-slime__glasses',
  leaf: 'game-afk-slime__leaf',
  beanie: 'game-afk-slime__beanie',
  flower: 'game-afk-slime__flower',
  halo: 'game-afk-slime__halo',
  bow: 'game-afk-slime__bow',
  patch: 'game-afk-slime__patch',
  sparkle: 'game-afk-slime__sparkle',
};

const BACK_LAYER: ReadonlySet<SlimeAccessoryKind> = new Set([
  'aura',
  'halo',
  'sparkle',
  'wing-l',
  'wing-r',
  'bone-a',
  'bone-b',
  'scar',
  'staff',
]);

export function isBackSlimeAccessory(kind: SlimeAccessoryKind): boolean {
  return BACK_LAYER.has(kind);
}

export function isFaceSlimeAccessory(kind: SlimeAccessoryKind): boolean {
  return kind === 'glasses' || kind === 'patch';
}

interface AccessoryProps {
  kind: SlimeAccessoryKind;
  hidden?: boolean;
}

export function SlimeAccessoryPart({ kind, hidden }: AccessoryProps) {
  return (
    <span
      className={`${KIND_CLASS[kind]}${hidden ? ' game-afk-slime__acc--hidden' : ''}`}
      aria-hidden
    />
  );
}

interface LootDropProps {
  kind: SlimeAccessoryKind;
  driftX: number;
  driftY: number;
  rotation: number;
  delayMs: number;
}

export function SlimeAccessoryLoot({ kind, driftX, driftY, rotation, delayMs }: LootDropProps) {
  return (
    <span
      className={`game-afk-slime__loot-piece ${KIND_CLASS[kind]}`}
      style={
        {
          '--loot-drift': `${driftX}px`,
          '--loot-pop': `${driftY}px`,
          '--loot-rot': `${rotation}deg`,
          '--loot-delay': `${delayMs}ms`,
        } as CSSProperties
      }
      aria-hidden
    />
  );
}

export function SlimeAccessoryLayer({
  accessories,
  looting,
  layer,
}: {
  accessories: SlimeAccessoryKind[];
  looting: boolean;
  layer: 'back' | 'front';
}) {
  const items = accessories.filter((kind) =>
    layer === 'back' ? isBackSlimeAccessory(kind) : !isBackSlimeAccessory(kind) && !isFaceSlimeAccessory(kind),
  );
  if (items.length === 0) return null;

  return (
    <div
      className={`game-afk-slime__accessories game-afk-slime__accessories--${layer}${looting ? ' game-afk-slime__accessories--looting' : ''}`}
    >
      {items.map((kind) => (
        <SlimeAccessoryPart key={kind} kind={kind} hidden={looting} />
      ))}
    </div>
  );
}
