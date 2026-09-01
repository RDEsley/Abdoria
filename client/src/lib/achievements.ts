import type { Achievement } from '@/types';

export function sortAchievements(achievements: Achievement[]): Achievement[] {
  return [...achievements].sort((a, b) => {
    if (a.desbloqueada !== b.desbloqueada) return a.desbloqueada ? -1 : 1;
    return a.pct_jogadores - b.pct_jogadores;
  });
}

export function pickAchievementPreview(achievements: Achievement[], limit: number): Achievement[] {
  const unlocked = achievements
    .filter((achievement) => achievement.desbloqueada)
    .sort((a, b) => (b.desbloqueada_ordem ?? -1) - (a.desbloqueada_ordem ?? -1));
  const locked = sortAchievements(achievements).filter((achievement) => !achievement.desbloqueada);
  return [...unlocked, ...locked]
    .filter(
      (achievement, index, all) =>
        all.findIndex((candidate) => candidate.id === achievement.id) === index,
    )
    .slice(0, limit);
}
