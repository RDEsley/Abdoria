/** Ganho de XP em qualquer lugar do app: a barra de XP do topo anima em
    bolinhas convergindo até ela (estilo Minecraft) em vez de saltar direto
    pro valor novo — ver XpOrbLayer e GameHud. */
export const XP_EARNED_EVENT = 'abdoria:xp-earned';
/** Disparado a cada bolinha que "chega" na barra — quem desenha a barra usa
    isso pra só subir o preenchimento na chegada, na ordem certa. */
export const XP_ORB_LANDED_EVENT = 'abdoria:xp-orb-landed';
/** Atributo no nó da barra de XP real (TopNavbar) — o alvo das bolinhas. */
export const XP_BAR_TARGET_ATTR = 'data-xp-bar-target';
/** 1 bolinha "vale" essa quantidade de XP — resto pequeno de ganhos que não
    dividem certinho vai todo pra última bolinha da leva. */
export const XP_PER_ORB = 5;

interface XpEarnedOriginRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface XpEarnedDetail {
  amount: number;
  originRect: XpEarnedOriginRect | null;
}

export interface XpOrbLandedDetail {
  amount: number;
}

/**
 * Dispara o ganho de XP pro HUD animar. As bolinhas saem de `originEl`
 * (centro do elemento — ex.: o item EXP Instantâneo usado) ou do centro da
 * tela quando omitido, e convergem pra barra de XP no topo. A barra só sobe
 * conforme cada bolinha chega (XpOrbLayer dispara XP_ORB_LANDED_EVENT).
 */
export function emitXpEarned(amount: number, originEl?: Element | null): void {
  const rounded = Math.round(amount);
  if (rounded <= 0) return;

  const rect = originEl?.getBoundingClientRect();
  const originRect: XpEarnedOriginRect | null = rect
    ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    : null;

  window.dispatchEvent(
    new CustomEvent<XpEarnedDetail>(XP_EARNED_EVENT, { detail: { amount: rounded, originRect } }),
  );
}
