/** Loot que cai de um inimigo abatido vira bolinha e voa até o baú da
    Exploração — ver AfkLootOrbLayer (anima) e AfkRewardGrid (o baú reage). */
export const AFK_LOOT_ORB_EVENT = 'abdoria:afk-loot-orb';
/** Disparado a cada bolinha que chega no baú — o baú dá uma mexida por
    bolinha, como se o item tivesse caído dentro. */
export const AFK_CHEST_RECEIVED_EVENT = 'abdoria:afk-chest-received';
/** Atributo no nó do baú do dock — o alvo das bolinhas. */
export const AFK_CHEST_TARGET_ATTR = 'data-afk-chest-target';

export interface AfkLootOrbOriginRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface AfkLootOrbDetail {
  count: number;
  originRect: AfkLootOrbOriginRect | null;
}

/**
 * Dispara as bolinhas de loot a partir de `originEl` (o slime que morreu).
 * Sem o baú montado na tela, a camada simplesmente não anima nada — o
 * combate segue normal.
 */
export function emitAfkLootOrbs(count: number, originEl?: Element | null): void {
  const rounded = Math.max(0, Math.round(count));
  if (rounded <= 0) return;

  const rect = originEl?.getBoundingClientRect();
  const originRect: AfkLootOrbOriginRect | null = rect
    ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    : null;

  window.dispatchEvent(
    new CustomEvent<AfkLootOrbDetail>(AFK_LOOT_ORB_EVENT, {
      detail: { count: rounded, originRect },
    }),
  );
}
