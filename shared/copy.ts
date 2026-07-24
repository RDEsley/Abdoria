import type { TomTexto } from './types/index.js';

/**
 * Textos com variante "Linguagem de Jogo" (RPG, padrão) e "Linguagem normal"
 * (direto, sem jargão de jogo) — pro usuário que não curte a camada RPG.
 * Cobre navegação e os cabeçalhos mais visíveis (Início/Perfil); não é uma
 * tradução exaustiva de toda copy do app — ver docs/private/NOTES.md pro
 * escopo e o que fica pra uma expansão futura.
 */
export const COPY = {
  nav_biblioteca: { jogo: 'Biblioteca', normal: 'Exercícios' },
  nav_construtor: { jogo: 'Missão', normal: 'Treinos' },
  nav_ranking: { jogo: 'Ranking', normal: 'Classificação' },
  nav_perfil: { jogo: 'Herói', normal: 'Perfil' },

  dashboard_quest_badge: { jogo: 'Missão diária', normal: 'Treino de hoje' },

  perfil_eyebrow: { jogo: 'Ficha do herói', normal: 'Seus dados' },
} as const satisfies Record<string, Record<TomTexto, string>>;

export type CopyKey = keyof typeof COPY;

export function resolveCopy(key: CopyKey, tom: TomTexto | undefined | null): string {
  return COPY[key][tom ?? 'jogo'];
}
