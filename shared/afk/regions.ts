import type { AfkEnemyId } from './combat.js';

export type AfkRegionId =
  | 'verdant-trail'
  | 'sunspire-ruins'
  | 'mooncrystal-marsh'
  | 'stone-fortress'
  | 'timekeep'
  | 'pillowwood';

export interface AfkRegionDefinition {
  id: AfkRegionId;
  chapter: number;
  name: string;
  subtitle: string;
  backgroundUrl: string;
  accent: string;
  bossId: AfkEnemyId;
  killsToBoss: number;
  commonEnemies: readonly AfkEnemyId[];
  eliteEnemies: readonly AfkEnemyId[];
  storyTitle: string;
  story: string;
}

/**
 * Campanha fixa da Exploração. O contador e o chefe pertencem à região, então
 * trocar de mapa nunca apaga o progresso já feito em outro capítulo.
 */
export const AFK_REGIONS: readonly AfkRegionDefinition[] = [
  {
    id: 'verdant-trail',
    chapter: 1,
    name: 'Trilha Verdejante',
    subtitle: 'Os caminhos além da Vila Abdoria',
    backgroundUrl: '/assets/exploration/region-01-verdant-trail.png',
    accent: '#7ddf92',
    bossId: 'boss_colossus',
    killsToBoss: 100,
    commonEnemies: ['bat', 'zombie', 'slime_macaco', 'slime_doce'],
    eliteEnemies: ['armored_skeleton'],
    storyTitle: 'O chamado da trilha',
    story:
      'O Rei Slime recua e a floresta volta a respirar. Entre as raízes, o herói encontra marcas levando às dunas — sinais de que os slimes protegem algo muito além da vila.',
  },
  {
    id: 'sunspire-ruins',
    chapter: 2,
    name: 'Ruínas do Sol',
    subtitle: 'Aquedutos esquecidos sob as dunas',
    backgroundUrl: '/assets/exploration/region-02-sunspire-ruins.png',
    accent: '#ffc66d',
    bossId: 'boss_crocodile',
    killsToBoss: 150,
    commonEnemies: ['sand_slime', 'slime_chocolate', 'slime_doce'],
    eliteEnemies: ['dune_brute', 'slime_chumbo'],
    storyTitle: 'Ecos sob a areia',
    story:
      'O Crocodilo de Areia abandona o portão soterrado. Um fragmento cristalino aponta para um pântano onde a lua nunca se põe e um antigo feiticeiro slime aguarda em silêncio.',
  },
  {
    id: 'mooncrystal-marsh',
    chapter: 3,
    name: 'Pântano Cristalunar',
    subtitle: 'Luzes antigas sob a lua',
    backgroundUrl: '/assets/exploration/region-03-mooncrystal-marsh.png',
    accent: '#86d7ff',
    bossId: 'boss_lich',
    killsToBoss: 200,
    commonEnemies: ['slime_agua', 'lich_slime', 'skeleton'],
    eliteEnemies: ['crystal_slime', 'necro_slime'],
    storyTitle: 'A palavra esquecida',
    story:
      'O Slime Lich deixa cair uma runa da antiga guarda. Ela fala de uma fortaleza selada por pedra viva — e de uma língua que somente o último guardião pode revelar.',
  },
  {
    id: 'stone-fortress',
    chapter: 4,
    name: 'Fortaleza de Pedra',
    subtitle: 'O pátio dos guardiões esquecidos',
    backgroundUrl: '/assets/exploration/region-04-stone-fortress.png',
    accent: '#b8c4b2',
    bossId: 'boss_golem',
    killsToBoss: 225,
    commonEnemies: ['stone_slime', 'skeleton', 'zombie'],
    eliteEnemies: ['stone_guardian', 'slime_knight', 'slime_chumbo'],
    storyTitle: 'O coração da fortaleza',
    story:
      'O Golem desaba, revelando um relógio imóvel dentro do peito. Seus ponteiros voltam a girar e indicam uma cidadela suspensa, onde todo compromisso parece chegar tarde demais.',
  },
  {
    id: 'timekeep',
    chapter: 5,
    name: 'Bastião do Tempo Perdido',
    subtitle: 'Relógios partidos acima das nuvens',
    backgroundUrl: '/assets/exploration/region-05-timekeep.png',
    accent: '#a9c9ff',
    bossId: 'boss_procrastinador',
    killsToBoss: 250,
    commonEnemies: ['storm_slime', 'clock_slime', 'slime_agua'],
    eliteEnemies: ['chronos_slime', 'slime_knight'],
    storyTitle: 'Amanhã não pode esperar',
    story:
      'O Slime Procrastinador enfim entrega o mapa que jurava terminar amanhã. O caminho final atravessa uma floresta adormecida, coberta por travesseiros e sonhos antigos.',
  },
  {
    id: 'pillowwood',
    chapter: 6,
    name: 'Bosque dos Travesseiros',
    subtitle: 'Onde até o vento prefere descansar',
    backgroundUrl: '/assets/exploration/region-06-pillowwood.png',
    accent: '#c9b5ff',
    bossId: 'boss_preguica',
    killsToBoss: 275,
    commonEnemies: ['sleepy_slime', 'dream_slime', 'slime_doce'],
    eliteEnemies: ['nightmare_slime', 'crystal_slime'],
    storyTitle: 'A voz dos slimes',
    story:
      'Ao despertar o Slime Preguiçoso, a última runa se completa. A fala incompreensível dos slimes ganha sentido: eles não queriam destruir Abdoria — tentavam testar alguém capaz de enfrentar o que ainda dorme além do bosque.',
  },
] as const;

const REGION_BY_ID = new Map(AFK_REGIONS.map((region) => [region.id, region]));

export function getAfkRegionById(regionId?: string | null): AfkRegionDefinition {
  return REGION_BY_ID.get(regionId as AfkRegionId) ?? AFK_REGIONS[0]!;
}

export function getNextAfkRegion(regionId: AfkRegionId): AfkRegionDefinition | null {
  const index = AFK_REGIONS.findIndex((region) => region.id === regionId);
  return index >= 0 ? (AFK_REGIONS[index + 1] ?? null) : null;
}

export interface AfkRegionProgress {
  region: AfkRegionDefinition;
  regionIndex: number;
  bossesDefeated: number;
  cycle: number;
}

/** Compatibilidade com saves antigos, que inferiam a região por kills totais. */
export function getAfkRegionProgress(
  killsTotal: number,
  regionId?: AfkRegionId,
): AfkRegionProgress {
  if (regionId) {
    const regionIndex = Math.max(
      0,
      AFK_REGIONS.findIndex((region) => region.id === regionId),
    );
    return {
      region: AFK_REGIONS[regionIndex]!,
      regionIndex,
      bossesDefeated: regionIndex,
      cycle: 1,
    };
  }

  const safeKills = Math.max(0, Math.floor(Number.isFinite(killsTotal) ? killsTotal : 0));
  let remaining = safeKills;
  let index = 0;
  while (index < AFK_REGIONS.length - 1) {
    const cycleKills = AFK_REGIONS[index]!.killsToBoss + 1;
    if (remaining < cycleKills) break;
    remaining -= cycleKills;
    index += 1;
  }
  return {
    region: AFK_REGIONS[index]!,
    regionIndex: index,
    bossesDefeated: index,
    cycle: 1,
  };
}

/** Mantido para consumidores antigos; o primeiro ciclo tem 100 inimigos + chefe. */
export const AFK_REGION_CYCLE_KILLS = AFK_REGIONS[0]!.killsToBoss + 1;
