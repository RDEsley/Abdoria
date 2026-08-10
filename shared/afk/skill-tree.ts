export type AfkSkillBranch = 'arco' | 'espada' | 'magia' | 'sobrevivencia' | 'fortuna';

export type AfkSkillEffect =
  | 'bow_damage_pct'
  | 'bow_crit_pct'
  | 'sword_damage_pct'
  | 'sword_crit_pct'
  | 'crit_damage_pct'
  | 'magic_damage_pct'
  | 'spell_drop_pct'
  | 'hero_hp_pct'
  | 'search_reduction_ms'
  | 'defeat_reduction_ms'
  | 'drop_chance_pct';

export interface AfkSkillNodeDefinition {
  id: string;
  branch: AfkSkillBranch;
  name: string;
  description: string;
  cost: number;
  requires: readonly string[];
  effect: AfkSkillEffect;
  value: number;
  x: number;
  y: number;
}

export const AFK_SKILL_NODES: readonly AfkSkillNodeDefinition[] = [
  {
    id: 'core_instinct',
    branch: 'sobrevivencia',
    name: 'Instinto',
    description: '+2% de vida.',
    cost: 1,
    requires: [],
    effect: 'hero_hp_pct',
    value: 2,
    x: 50,
    y: 50,
  },
  {
    id: 'bow_focus_1',
    branch: 'arco',
    name: 'Mira Serena',
    description: '+1% de dano com arco.',
    cost: 1,
    requires: ['core_instinct'],
    effect: 'bow_damage_pct',
    value: 1,
    x: 39,
    y: 46,
  },
  {
    id: 'sword_focus_1',
    branch: 'espada',
    name: 'Pulso Firme',
    description: '+1% de dano com espada.',
    cost: 1,
    requires: ['core_instinct'],
    effect: 'sword_damage_pct',
    value: 1,
    x: 61,
    y: 46,
  },
  {
    id: 'magic_focus_1',
    branch: 'magia',
    name: 'Centelha Arcana',
    description: '+1,5% de dano mágico.',
    cost: 1,
    requires: ['core_instinct'],
    effect: 'magic_damage_pct',
    value: 1.5,
    x: 39,
    y: 58,
  },
  {
    id: 'vitality_1',
    branch: 'sobrevivencia',
    name: 'Fôlego',
    description: '+3% de vida.',
    cost: 1,
    requires: ['core_instinct'],
    effect: 'hero_hp_pct',
    value: 3,
    x: 50,
    y: 38,
  },
  {
    id: 'bow_crit_1',
    branch: 'arco',
    name: 'Olho do Vento',
    description: '+0,2% de crítico com arco.',
    cost: 2,
    requires: ['bow_focus_1'],
    effect: 'bow_crit_pct',
    value: 0.2,
    x: 29,
    y: 38,
  },
  {
    id: 'bow_focus_2',
    branch: 'arco',
    name: 'Tensão Perfeita',
    description: '+1,5% de dano com arco.',
    cost: 2,
    requires: ['bow_focus_1'],
    effect: 'bow_damage_pct',
    value: 1.5,
    x: 28,
    y: 52,
  },
  {
    id: 'sword_crit_1',
    branch: 'espada',
    name: 'Abertura',
    description: '+0,15% de crítico com espada.',
    cost: 2,
    requires: ['sword_focus_1'],
    effect: 'sword_crit_pct',
    value: 0.15,
    x: 70,
    y: 36,
  },
  {
    id: 'sword_crit_damage',
    branch: 'espada',
    name: 'Golpe Decisivo',
    description: '+2% de dano crítico.',
    cost: 2,
    requires: ['sword_crit_1'],
    effect: 'crit_damage_pct',
    value: 2,
    x: 72,
    y: 53,
  },
  {
    id: 'magic_focus_2',
    branch: 'magia',
    name: 'Canalização',
    description: '+2% de dano mágico.',
    cost: 2,
    requires: ['magic_focus_1'],
    effect: 'magic_damage_pct',
    value: 2,
    x: 31,
    y: 67,
  },
  {
    id: 'spell_fortune',
    branch: 'magia',
    name: 'Eco Místico',
    description: '+0,2% na chance de magia.',
    cost: 3,
    requires: ['magic_focus_2'],
    effect: 'spell_drop_pct',
    value: 0.2,
    x: 23,
    y: 76,
  },
  {
    id: 'search_1',
    branch: 'fortuna',
    name: 'Rastreador',
    description: '-150ms na procura.',
    cost: 1,
    requires: ['core_instinct'],
    effect: 'search_reduction_ms',
    value: 150,
    x: 61,
    y: 58,
  },
  {
    id: 'search_2',
    branch: 'fortuna',
    name: 'Caçador de Rotas',
    description: '-250ms na procura.',
    cost: 2,
    requires: ['search_1'],
    effect: 'search_reduction_ms',
    value: 250,
    x: 70,
    y: 82,
  },
  {
    id: 'vitality_2',
    branch: 'sobrevivencia',
    name: 'Coração de Abdoria',
    description: '+5% de vida.',
    cost: 2,
    requires: ['vitality_1'],
    effect: 'hero_hp_pct',
    value: 5,
    x: 50,
    y: 25,
  },
  {
    id: 'regen_1',
    branch: 'sobrevivencia',
    name: 'Levantar',
    description: '-0,5s derrotado.',
    cost: 2,
    requires: ['vitality_1'],
    effect: 'defeat_reduction_ms',
    value: 500,
    x: 58,
    y: 30,
  },
  {
    id: 'regen_2',
    branch: 'sobrevivencia',
    name: 'Indomável',
    description: '-0,75s derrotado.',
    cost: 3,
    requires: ['regen_1', 'vitality_2'],
    effect: 'defeat_reduction_ms',
    value: 750,
    x: 61,
    y: 18,
  },
  {
    id: 'luck_1',
    branch: 'fortuna',
    name: 'Brilho Raro',
    description: '+0,05% de chance de drop.',
    cost: 3,
    requires: ['search_1'],
    effect: 'drop_chance_pct',
    value: 0.05,
    x: 70,
    y: 67,
  },
  {
    id: 'luck_2',
    branch: 'fortuna',
    name: 'Destino Favorável',
    description: '+0,1% de chance de drop.',
    cost: 5,
    requires: ['luck_1', 'search_2'],
    effect: 'drop_chance_pct',
    value: 0.1,
    x: 80,
    y: 76,
  },
  {
    id: 'bow_precision_2',
    branch: 'arco',
    name: 'Flecha Silenciosa',
    description: '+0,25% de crítico com arco.',
    cost: 3,
    requires: ['bow_crit_1'],
    effect: 'bow_crit_pct',
    value: 0.25,
    x: 18,
    y: 30,
  },
  {
    id: 'bow_mastery',
    branch: 'arco',
    name: 'Vento Cortante',
    description: '+2% de dano com arco.',
    cost: 4,
    requires: ['bow_precision_2', 'bow_focus_2'],
    effect: 'bow_damage_pct',
    value: 2,
    x: 14,
    y: 46,
  },
  {
    id: 'sword_edge_2',
    branch: 'espada',
    name: 'Fio Ancestral',
    description: '+2% de dano com espada.',
    cost: 3,
    requires: ['sword_crit_damage'],
    effect: 'sword_damage_pct',
    value: 2,
    x: 81,
    y: 28,
  },
  {
    id: 'sword_mastery',
    branch: 'espada',
    name: 'Dança das Lâminas',
    description: '+0,25% de crítico com espada.',
    cost: 4,
    requires: ['sword_edge_2'],
    effect: 'sword_crit_pct',
    value: 0.25,
    x: 90,
    y: 39,
  },
  {
    id: 'magic_fortune_2',
    branch: 'magia',
    name: 'Runa Ressonante',
    description: '+0,25% na chance de magia.',
    cost: 4,
    requires: ['spell_fortune'],
    effect: 'spell_drop_pct',
    value: 0.25,
    x: 14,
    y: 66,
  },
  {
    id: 'magic_mastery',
    branch: 'magia',
    name: 'Núcleo Arcano',
    description: '+2,5% de dano mágico.',
    cost: 5,
    requires: ['magic_fortune_2'],
    effect: 'magic_damage_pct',
    value: 2.5,
    x: 7,
    y: 79,
  },
  {
    id: 'vitality_3',
    branch: 'sobrevivencia',
    name: 'Casca Viva',
    description: '+4% de vida.',
    cost: 3,
    requires: ['vitality_2'],
    effect: 'hero_hp_pct',
    value: 4,
    x: 50,
    y: 12,
  },
  {
    id: 'regen_3',
    branch: 'sobrevivencia',
    name: 'Segundo Fôlego',
    description: '-0,75s derrotado.',
    cost: 4,
    requires: ['regen_2', 'vitality_3'],
    effect: 'defeat_reduction_ms',
    value: 750,
    x: 67,
    y: 9,
  },
  {
    id: 'search_3',
    branch: 'fortuna',
    name: 'Olhos na Trilha',
    description: '-300ms na procura.',
    cost: 4,
    requires: ['search_2'],
    effect: 'search_reduction_ms',
    value: 300,
    x: 85,
    y: 61,
  },
  {
    id: 'luck_3',
    branch: 'fortuna',
    name: 'Sopro do Destino',
    description: '+0,1% de chance de drop.',
    cost: 6,
    requires: ['luck_2', 'search_3'],
    effect: 'drop_chance_pct',
    value: 0.1,
    x: 93,
    y: 70,
  },
] as const;

const SKILL_BY_ID = new Map(AFK_SKILL_NODES.map((node) => [node.id, node]));

export function getAfkSkillNode(id: string): AfkSkillNodeDefinition | null {
  return SKILL_BY_ID.get(id) ?? null;
}

export function getAfkSkillTotal(
  unlocked: readonly string[] | undefined,
  effect: AfkSkillEffect,
): number {
  const ids = new Set(unlocked ?? []);
  return AFK_SKILL_NODES.reduce(
    (total, node) => total + (ids.has(node.id) && node.effect === effect ? node.value : 0),
    0,
  );
}

export function canUnlockAfkSkill(unlocked: readonly string[], nodeId: string): boolean {
  const node = getAfkSkillNode(nodeId);
  if (!node || unlocked.includes(node.id)) return false;
  return node.requires.every((required) => unlocked.includes(required));
}

export function afkHeroMaxHp(unlocked?: readonly string[]): number {
  return Math.round(250 * (1 + getAfkSkillTotal(unlocked, 'hero_hp_pct') / 100));
}

export function afkDefeatDurationMs(unlocked?: readonly string[]): number {
  return Math.max(6_000, 10_000 - getAfkSkillTotal(unlocked, 'defeat_reduction_ms'));
}

export function afkSearchReductionMs(unlocked?: readonly string[]): number {
  return getAfkSkillTotal(unlocked, 'search_reduction_ms');
}
