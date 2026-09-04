/** Filtro único da população do ranking global. */

export const LEADERBOARD_BASE_FILTER = {
  onboarding_completed: true,
  is_guest: false,
  is_demo_npc: false,
} as const;

export function isHiddenAdmin(user: {
  role?: string | null;
  preferencias?: { admin_visivel_ranking?: boolean } | null;
}): boolean {
  return user.role === 'admin' && user.preferencias?.admin_visivel_ranking !== true;
}

/** Mesma população para listagem, /me, total e rank. */
export function filterRankingPopulation<T extends Parameters<typeof isHiddenAdmin>[0]>(
  users: readonly T[],
): T[] {
  return users.filter((user) => !isHiddenAdmin(user));
}

export function computeRankAmongPopulation<
  T extends { id: string; nome: string } & Parameters<typeof isHiddenAdmin>[0],
>(
  population: readonly T[],
  user: T,
  valueOf: (entry: T) => number,
): { rank: number | null; total: number; hidden_from_ranking: boolean } {
  const visible = filterRankingPopulation(population);
  const total = visible.length;
  if (isHiddenAdmin(user)) {
    return { rank: null, total, hidden_from_ranking: true };
  }
  const myValue = valueOf(user);
  const rank =
    visible.filter((other) => {
      if (other.id === user.id) return false;
      const otherValue = valueOf(other);
      return (
        otherValue > myValue ||
        (otherValue === myValue && other.nome.localeCompare(user.nome, 'pt-BR') < 0)
      );
    }).length + 1;
  return { rank, total, hidden_from_ranking: false };
}
