import type { MolduraId } from '@/types';

interface BorderSource {
  borda_perfil_fonte?: 'podio' | 'loja';
  moldura_equipada?: MolduraId | null;
  moldura_loja_equipada?: string | null;
}

export interface IdentityBorder {
  /** Moldura de pódio a desenhar (null quando a borda ativa é de conquista). */
  moldura: MolduraId | null;
  /** Borda de conquista (moldura_loja) a desenhar, ou null. */
  borderLoja: string | null;
}

/**
 * Resolve qual borda o avatar de identidade deve mostrar. Regra "última equipada
 * vence": `borda_perfil_fonte` diz se a ativa é a de pódio ou a de conquista.
 * Ausente = pódio (comportamento antigo). Serve tanto pro próprio perfil
 * (`Cosmeticos`) quanto pro perfil público (`PublicProfile`).
 */
export function resolveIdentityBorder(source: BorderSource | null | undefined): IdentityBorder {
  if (source?.borda_perfil_fonte === 'loja') {
    return { moldura: null, borderLoja: source.moldura_loja_equipada ?? null };
  }
  return { moldura: source?.moldura_equipada ?? null, borderLoja: null };
}
