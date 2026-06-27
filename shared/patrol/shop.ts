import {
  AFK_HERO_DAMAGE_ARCO,
  AFK_HERO_DAMAGE_ESPADA,
} from '../afk/combat.js';

export type PatrolWeaponKind = 'arco' | 'espada' | 'magia';
export type PatrolWeaponRarity = 'comum' | 'raro' | 'epico' | 'lendario';

export type PatrolWeaponUnlock =
  | { tipo: 'gratis' }
  | { tipo: 'moedas'; preco_moedas: number }
  | { tipo: 'futuro' };

export interface PatrolWeaponDefinition {
  id: string;
  kind: PatrolWeaponKind;
  nome: string;
  descricao: string;
  raridade: PatrolWeaponRarity;
  unlock: PatrolWeaponUnlock;
  dano_bonus: number;
}

export interface PatrolArmasState {
  desbloqueados: string[];
  arco_equipado: string;
  espada_equipada: string;
}

export const DEFAULT_ARCO_ID = 'arco_basico';
export const DEFAULT_ESPADA_ID = 'espada_basica';

export const PATROL_WEAPONS: PatrolWeaponDefinition[] = [
  {
    id: 'arco_basico',
    kind: 'arco',
    nome: 'Arco de madeira',
    descricao: 'Arco simples da exploração. Confiável para começar.',
    raridade: 'comum',
    unlock: { tipo: 'gratis' },
    dano_bonus: 0,
  },
  {
    id: 'arco_caca',
    kind: 'arco',
    nome: 'Arco de caça',
    descricao: 'Mais tensão na corda — flechas mais certeiras.',
    raridade: 'comum',
    unlock: { tipo: 'moedas', preco_moedas: 35 },
    dano_bonus: 2,
  },
  {
    id: 'arco_elfico',
    kind: 'arco',
    nome: 'Arco élfico',
    descricao: 'Madeira leve e encantada. Dispara com graça mortal.',
    raridade: 'raro',
    unlock: { tipo: 'moedas', preco_moedas: 80 },
    dano_bonus: 4,
  },
  {
    id: 'arco_vulcao',
    kind: 'arco',
    nome: 'Arco vulcânico',
    descricao: 'Flechas incandescentes forjadas na lava.',
    raridade: 'epico',
    unlock: { tipo: 'moedas', preco_moedas: 150 },
    dano_bonus: 6,
  },
  {
    id: 'espada_basica',
    kind: 'espada',
    nome: 'Espada de treino',
    descricao: 'Lâmina básica da guarda. Sempre à mão.',
    raridade: 'comum',
    unlock: { tipo: 'gratis' },
    dano_bonus: 0,
  },
  {
    id: 'espada_ferro',
    kind: 'espada',
    nome: 'Espada de ferro',
    descricao: 'Em breve na loja da exploração.',
    raridade: 'comum',
    unlock: { tipo: 'futuro' },
    dano_bonus: 3,
  },
  {
    id: 'espada_runica',
    kind: 'espada',
    nome: 'Espada rúnica',
    descricao: 'Em breve na loja da exploração.',
    raridade: 'raro',
    unlock: { tipo: 'futuro' },
    dano_bonus: 5,
  },
  {
    id: 'espada_dragao',
    kind: 'espada',
    nome: 'Lâmina do dragão',
    descricao: 'Em breve na loja da exploração.',
    raridade: 'lendario',
    unlock: { tipo: 'futuro' },
    dano_bonus: 8,
  },
];

export const PATROL_WEAPON_BY_ID = Object.fromEntries(
  PATROL_WEAPONS.map((item) => [item.id, item]),
) as Record<string, PatrolWeaponDefinition>;

export function resolvePatrolArmas(pref?: Partial<PatrolArmasState> | null): PatrolArmasState {
  const desbloqueados = new Set(pref?.desbloqueados ?? []);
  desbloqueados.add(DEFAULT_ARCO_ID);
  desbloqueados.add(DEFAULT_ESPADA_ID);

  const arcoEquipado =
    pref?.arco_equipado && desbloqueados.has(pref.arco_equipado)
      ? pref.arco_equipado
      : DEFAULT_ARCO_ID;
  const espadaEquipada =
    pref?.espada_equipada && desbloqueados.has(pref.espada_equipada)
      ? pref.espada_equipada
      : DEFAULT_ESPADA_ID;

  return {
    desbloqueados: [...desbloqueados],
    arco_equipado: arcoEquipado,
    espada_equipada: espadaEquipada,
  };
}

export function patrolWeaponsByKind(kind: PatrolWeaponKind): PatrolWeaponDefinition[] {
  return PATROL_WEAPONS.filter((item) => item.kind === kind);
}

export function patrolHeroDamage(
  kind: 'arco' | 'espada',
  weaponId: string,
): number {
  const base = kind === 'arco' ? AFK_HERO_DAMAGE_ARCO : AFK_HERO_DAMAGE_ESPADA;
  const bonus = PATROL_WEAPON_BY_ID[weaponId]?.dano_bonus ?? 0;
  return base + bonus;
}

export const PATROL_WEAPON_RARITY_LABELS: Record<PatrolWeaponRarity, string> = {
  comum: 'Comum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
};
