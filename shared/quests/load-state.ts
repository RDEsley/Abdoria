/** Fase visual do board de Missões (full). Refresh com dados não troca de fase. */
export function resolveQuestBoardPhase(input: {
  initialLoading: boolean;
  loadError: boolean;
  hasQuests: boolean;
}): 'skeleton' | 'error' | 'content' {
  if (input.initialLoading) return 'skeleton';
  if (input.loadError && !input.hasQuests) return 'error';
  return 'content';
}

/**
 * Em refresh com conteúdo válido, falha de rede não apaga a lista.
 * Só limpa / marca erro de board quando ainda não houve carga útil.
 */
export function shouldWipeQuestsOnLoadFailure(input: {
  hasLoadedOnce: boolean;
  hasQuests: boolean;
}): boolean {
  return !input.hasLoadedOnce || !input.hasQuests;
}
