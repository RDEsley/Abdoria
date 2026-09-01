export const COPY = {
  dashboard_quest_badge: 'Treino de hoje',
  perfil_eyebrow: 'Seus dados',
  xp_unit: 'pontos',
  conquistas_eyebrow: 'Suas conquistas',
  conquistas_title: 'Conquistas',
  conquistas_subtitle: '% real de jogadores com cada uma',
} as const;

export type CopyKey = keyof typeof COPY;

export function resolveCopy(key: CopyKey): string {
  return COPY[key];
}
