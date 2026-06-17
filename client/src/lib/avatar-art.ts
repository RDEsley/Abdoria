/** Retratos de perfil da loja — arte em pixel gerada para preencher o quadro inteiro. */
export const AVATAR_ART: Record<string, { src: string; alt: string }> = {
  avatar_portal: { src: '/cosmetics/avatars/avatar_portal.png', alt: 'Portal de aventura' },
  avatar_chama: { src: '/cosmetics/avatars/avatar_chama.png', alt: 'Dragãozinho de fogo' },
  avatar_estrela: { src: '/cosmetics/avatars/avatar_estrela.png', alt: 'Blob cósmico estrelado' },
  avatar_trofeu: { src: '/cosmetics/avatars/avatar_trofeu.png', alt: 'Pato campeão' },
  avatar_haltere: { src: '/cosmetics/avatars/avatar_haltere.png', alt: 'Hamster fortão' },
  avatar_coracao: { src: '/cosmetics/avatars/avatar_coracao.png', alt: 'Sapo coração' },
  avatar_coroa: { src: '/cosmetics/avatars/avatar_coroa.png', alt: 'Dragão real' },
  avatar_foguete: { src: '/cosmetics/avatars/avatar_foguete.png', alt: 'Pato astronauta' },
  avatar_escudo: { src: '/cosmetics/avatars/avatar_escudo.png', alt: 'Capivara cavaleira' },
};

export function avatarArtSrc(avatarId: string): string | null {
  return AVATAR_ART[avatarId]?.src ?? null;
}

export function avatarArtAlt(avatarId: string, fallback?: string): string {
  return AVATAR_ART[avatarId]?.alt ?? fallback ?? 'Avatar';
}
