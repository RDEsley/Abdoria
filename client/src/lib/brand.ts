/** Marca Abdoria — arte oficial em `client/public/brand/`. */
export const BRAND_FAVICON = {
  16: '/brand/favicon-16.png',
  32: '/brand/favicon-32.png',
  48: '/brand/favicon-48.png',
  180: '/brand/favicon-180.png',
  256: '/brand/favicon-256.png',
} as const;

/** Ícone principal (telas de auth, prévias grandes). */
export const BRAND_MARK_SRC = BRAND_FAVICON[256];

/** Sidebar desktop (48×48). */
export const BRAND_SIDEBAR_SRC = BRAND_FAVICON[48];

/** Escolhe o PNG mais nítido para o tamanho exibido em px. */
export function brandMarkSrc(displayPx: number): string {
  if (displayPx <= 20) return BRAND_FAVICON[16];
  if (displayPx <= 40) return BRAND_FAVICON[32];
  if (displayPx <= 56) return BRAND_FAVICON[48];
  if (displayPx <= 140) return BRAND_FAVICON[180];
  return BRAND_FAVICON[256];
}
