export type HomeOptionalSectionId = 'weekly_chronicle' | 'muscle_zones' | 'achievements';

export const DEFAULT_HOME_OPTIONAL_SECTIONS: HomeOptionalSectionId[] = [
  'weekly_chronicle',
  'muscle_zones',
  'achievements',
];

export const HOME_OPTIONAL_SECTION_LABELS: Record<HomeOptionalSectionId, string> = {
  weekly_chronicle: 'Resumo da rotina',
  muscle_zones: 'Zonas da semana',
  achievements: 'Conquistas',
};

export function normalizeHomeOptionalSections(
  order?: HomeOptionalSectionId[] | null,
): HomeOptionalSectionId[] {
  const valid = new Set<HomeOptionalSectionId>(DEFAULT_HOME_OPTIONAL_SECTIONS);
  const normalized = (order ?? []).filter(
    (section, index, all) => valid.has(section) && all.indexOf(section) === index,
  );
  for (const section of DEFAULT_HOME_OPTIONAL_SECTIONS) {
    if (!normalized.includes(section)) normalized.push(section);
  }
  return normalized;
}
