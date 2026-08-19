import type { TomTexto } from './types/index.js';

/**
 * Textos legados mantêm as duas chaves por compatibilidade com preferências
 * já persistidas, mas a interface usa sempre a linguagem normal.
 */
export const COPY = {
  nav_biblioteca: { jogo: 'Treinos', normal: 'Exercícios' },
  nav_construtor: { jogo: 'Missão', normal: 'Treinos' },
  nav_ranking: { jogo: 'Ranking', normal: 'Classificação' },
  nav_perfil: { jogo: 'Herói', normal: 'Perfil' },

  dashboard_quest_badge: { jogo: 'Missão diária', normal: 'Treino de hoje' },

  perfil_eyebrow: { jogo: 'Ficha do herói', normal: 'Seus dados' },

  xp_unit: { jogo: 'XP', normal: 'pontos' },
  hp_unit: { jogo: 'HP', normal: 'vida' },

  conquistas_eyebrow: { jogo: 'Hall da fama', normal: 'Suas conquistas' },
  conquistas_title: { jogo: 'Conquistas', normal: 'Conquistas' },
  conquistas_subtitle: {
    jogo: '% real de heróis com cada uma',
    normal: '% real de jogadores com cada uma',
  },
} as const satisfies Record<string, Record<TomTexto, string>>;

export type CopyKey = keyof typeof COPY;

export function resolveCopy(key: CopyKey, tom: TomTexto | undefined | null): string {
  void tom;
  return COPY[key].normal;
}
