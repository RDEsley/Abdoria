export type PatrolWeaponKind = 'arco' | 'espada' | 'magia';
export type PatrolWeaponRarity = 'comum' | 'raro' | 'epico' | 'lendario' | 'secreto';

export type PatrolWeaponUnlock =
  | { tipo: 'gratis' }
  | { tipo: 'moedas'; preco_moedas: number }
  | { tipo: 'futuro' };

export interface PatrolWeaponDefinition {
  id: string;
  kind: PatrolWeaponKind;
  nivel: number;
  nome: string;
  descricao: string;
  raridade: PatrolWeaponRarity;
  unlock: PatrolWeaponUnlock;
  dano_base: number;
}

export interface PatrolArmasState {
  desbloqueados: string[];
  arco_equipado: string;
  espada_equipada: string;
}

export const DEFAULT_ARCO_ID = 'arco_01';
export const DEFAULT_ESPADA_ID = 'espada_01';

/** Armas lendárias (nível 9) dropáveis de bosses. */
export const PATROL_LEGENDARY_WEAPON_IDS = ['arco_09', 'espada_09'] as const;

const LEGACY_WEAPON_ID_MAP: Record<string, string> = {
  arco_basico: 'arco_01',
  arco_caca: 'arco_02',
  arco_elfico: 'arco_03',
  arco_vulcao: 'arco_04',
  espada_basica: 'espada_01',
  espada_ferro: 'espada_02',
  espada_runica: 'espada_03',
  espada_dragao: 'espada_09',
};

function rarityForLevel(nivel: number): PatrolWeaponRarity {
  if (nivel >= 10) return 'secreto';
  if (nivel >= 7) return 'lendario';
  if (nivel >= 5) return 'epico';
  if (nivel >= 3) return 'raro';
  return 'comum';
}

type WeaponSeed = {
  nivel: number;
  preco: number;
  dano: number;
  nome: string;
  descricao: string;
};

const ARCO_SEEDS: WeaponSeed[] = [
  { nivel: 1, preco: 335, dano: 10, nome: 'Arco de Madeira', descricao: 'Arco simples da exploração. Confiável para começar.' },
  { nivel: 2, preco: 665, dano: 14, nome: 'Arco de Caçador', descricao: 'Mais tensão na corda — flechas mais certeiras.' },
  { nivel: 3, preco: 1340, dano: 18, nome: 'Arco Silvestre', descricao: 'Madeira temperada das florestas do reino.' },
  { nivel: 4, preco: 2340, dano: 20, nome: 'Arco do Vento', descricao: 'Corta o ar com precisão letal.' },
  { nivel: 5, preco: 3950, dano: 24, nome: 'Arco de Cristal', descricao: 'Flechas refratam luz e perfuram armaduras leves.' },
  { nivel: 6, preco: 5700, dano: 28, nome: 'Arco Flamejante', descricao: 'Flechas incandescentes forjadas na lava.' },
  { nivel: 7, preco: 12300, dano: 32, nome: 'Arco Celestial', descricao: 'Abençoado pelas constelações da patrulha.' },
  { nivel: 8, preco: 18940, dano: 36, nome: 'Arco do Abismo', descricao: 'Sussurra nas sombras antes de cada disparo.' },
  { nivel: 9, preco: 55000, dano: 48, nome: 'Arco Dracônico', descricao: 'Lendário — escamas de dragão reforçam o arco.' },
  {
    nivel: 10,
    preco: 99999,
    dano: 0,
    nome: 'Arco do Véu Eterno',
    descricao: 'Secreto — Hit Kill em slimes comuns. Elite, boss e Golden: 52 de dano, 28% crítico com combo.',
  },
];

const ESPADA_SEEDS: WeaponSeed[] = [
  { nivel: 1, preco: 470, dano: 12, nome: 'Espada de Treino', descricao: 'Lâmina básica da guarda. Sempre à mão.' },
  { nivel: 2, preco: 800, dano: 16, nome: 'Espada de Ferro', descricao: 'Aço temperado para patrulhas longas.' },
  { nivel: 3, preco: 1475, dano: 20, nome: 'Espada Rúnica', descricao: 'Runas antigas amplificam cada golpe.' },
  { nivel: 4, preco: 2475, dano: 26, nome: 'Espada do Guardião', descricao: 'Forjada para proteger os exploradores.' },
  { nivel: 5, preco: 4085, dano: 30, nome: 'Espada de Aço Negro', descricao: 'Peso perfeito e fio implacável.' },
  { nivel: 6, preco: 5835, dano: 36, nome: 'Espada Valente', descricao: 'Carregada por heróis das campanhas AFK.' },
  { nivel: 7, preco: 12435, dano: 42, nome: 'Espada do Campeão', descricao: 'Troféu dos vencedores do ranking semanal.' },
  { nivel: 8, preco: 19075, dano: 58, nome: 'Espada Imortal', descricao: 'Brilha mesmo após mil batalhas.' },
  { nivel: 9, preco: 55135, dano: 70, nome: 'Lâmina do Dragão', descricao: 'Lendária — fogo dracônico na lâmina.' },
  {
    nivel: 10,
    preco: 99999,
    dano: 0,
    nome: 'Espada do Crepúsculo',
    descricao: 'Secreta — Hit Kill em slimes comuns. Elite, boss e Golden: 60 de dano, 18% crítico.',
  },
];

function buildWeapon(kind: 'arco' | 'espada', seed: WeaponSeed): PatrolWeaponDefinition {
  const prefix = kind === 'arco' ? 'arco' : 'espada';
  const id = `${prefix}_${String(seed.nivel).padStart(2, '0')}`;
  const unlock: PatrolWeaponUnlock =
    seed.nivel === 1 ? { tipo: 'gratis' } : { tipo: 'moedas', preco_moedas: seed.preco };

  return {
    id,
    kind,
    nivel: seed.nivel,
    nome: seed.nome,
    descricao: seed.descricao,
    raridade: rarityForLevel(seed.nivel),
    unlock,
    dano_base: seed.dano,
  };
}

export const PATROL_WEAPONS: PatrolWeaponDefinition[] = [
  ...ARCO_SEEDS.map((seed) => buildWeapon('arco', seed)),
  ...ESPADA_SEEDS.map((seed) => buildWeapon('espada', seed)),
];

export const PATROL_WEAPON_BY_ID = Object.fromEntries(
  PATROL_WEAPONS.map((item) => [item.id, item]),
) as Record<string, PatrolWeaponDefinition>;

function migrateWeaponId(id: string): string {
  return LEGACY_WEAPON_ID_MAP[id] ?? id;
}

export function resolvePatrolArmas(pref?: Partial<PatrolArmasState> | null): PatrolArmasState {
  const raw = pref?.desbloqueados ?? [];
  const desbloqueados = new Set(raw.map(migrateWeaponId));
  desbloqueados.add(DEFAULT_ARCO_ID);
  desbloqueados.add(DEFAULT_ESPADA_ID);

  const arcoEquipadoRaw = migrateWeaponId(pref?.arco_equipado ?? DEFAULT_ARCO_ID);
  const espadaEquipadaRaw = migrateWeaponId(pref?.espada_equipada ?? DEFAULT_ESPADA_ID);

  const arcoEquipado = desbloqueados.has(arcoEquipadoRaw) ? arcoEquipadoRaw : DEFAULT_ARCO_ID;
  const espadaEquipada = desbloqueados.has(espadaEquipadaRaw) ? espadaEquipadaRaw : DEFAULT_ESPADA_ID;

  return {
    desbloqueados: [...desbloqueados],
    arco_equipado: arcoEquipado,
    espada_equipada: espadaEquipada,
  };
}

export function patrolWeaponsByKind(kind: PatrolWeaponKind): PatrolWeaponDefinition[] {
  return PATROL_WEAPONS.filter((item) => item.kind === kind);
}

export function patrolHeroDamage(kind: 'arco' | 'espada', weaponId: string): number {
  const migrated = migrateWeaponId(weaponId);
  const def = PATROL_WEAPON_BY_ID[migrated];
  if (!def || def.kind !== kind) {
    return kind === 'arco' ? 10 : 12;
  }
  if (def.nivel === 10) {
    return kind === 'arco' ? 52 : 60;
  }
  return def.dano_base;
}

/** @deprecated Use {@link patrolHeroDamage} com `dano_base`. */
export function patrolWeaponDanoBonus(weaponId: string): number {
  const def = PATROL_WEAPON_BY_ID[migrateWeaponId(weaponId)];
  return def?.dano_base ?? 0;
}

export const PATROL_WEAPON_RARITY_LABELS: Record<PatrolWeaponRarity, string> = {
  comum: 'Comum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
  secreto: 'Secreto',
};
