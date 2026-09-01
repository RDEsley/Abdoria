import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';

/**
 * Títulos com estilo/animação própria — id → classe CSS extra. Centralizado aqui
 * pra que todas as superfícies (card do Início, HUD, Perfil, perfil público)
 * apliquem a mesma decoração. Títulos novos com animação entram só nesta lista.
 */
const SPECIAL_TITLE_CLASS: Record<string, string> = {
  titulo_dono_do_jogo: 'cosmetic-title--dono-do-jogo',
  titulo_secreto: 'cosmetic-title--secreto',
  titulo_toque_dourado: 'cosmetic-title--golden',
  titulo_enigma: 'cosmetic-title--enigma',
  titulo_codigo_evolucao: 'cosmetic-title--codigo-evolucao',
};

/** Títulos cujo texto pula caractere a caractere (ver AnimatedTitleText). */
const CHARACTER_WAVE_TITLE_IDS: ReadonlySet<string> = new Set(['titulo_enigma']);

export interface ResolvedTitle {
  id: string;
  name: string;
  /** Classe extra de animação/estilo, ou '' para títulos comuns. */
  variantClass: string;
  /** true = o texto pula caractere a caractere (ver AnimatedTitleText). */
  animateChars: boolean;
}

/**
 * Resolve o título equipado num nome exibível + classe de estilo. Retorna null
 * quando não há título equipado ou o id não existe mais no catálogo.
 */
export function resolveEquippedTitle(titleId: string | null | undefined): ResolvedTitle | null {
  if (!titleId) return null;
  const name = COSMETIC_BY_ID[titleId]?.nome;
  if (!name) return null;
  return {
    id: titleId,
    name,
    variantClass: SPECIAL_TITLE_CLASS[titleId] ?? '',
    animateChars: CHARACTER_WAVE_TITLE_IDS.has(titleId),
  };
}
