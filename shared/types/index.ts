/**
 * Tipos de domínio compartilhados entre client e server.
 * Mantém contratos de API, exercícios, usuário e gamificação alinhados.
 */

import type { AfkCombatState } from '../afk/combat.js';
import { DEFAULT_AFK_COMBAT } from '../afk/combat.js';

export type NivelUsuario = 'iniciante' | 'intermediario' | 'avancado';

export type Objetivo = 'definicao' | 'resistencia' | 'forca' | 'manutencao';

export type MusculoPrincipal =
  | 'superior'
  | 'inferior'
  | 'obliquos'
  | 'core'
  | 'completo';

export type Prioridade = 'S' | 'A' | 'B' | 'C' | 'dinamico' | 'isometrico';

export type TreinoBase = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export const CICLO_LABELS: Record<TreinoBase, string> = {
  A: 'Superior',
  B: 'Oblíquos',
  C: 'Inferior',
  D: 'Core',
  E: 'Completo',
  F: 'HIIT',
  G: 'Mobilidade',
};

/** Ciclos extras — disponíveis nas configurações, fora do padrão inicial. */
export const CICLOS_OPCIONAIS: TreinoBase[] = ['F', 'G'];

/** Ordem canônica dos ciclos (A → G). */
export const CICLO_ORDER: TreinoBase[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

/** Normaliza ciclos do usuário: ordem fixa, mínimo 2, sem duplicatas. */
export function normalizeCicloTreinos(ciclos?: TreinoBase[] | null): TreinoBase[] {
  const raw = ciclos ?? ['A', 'B', 'C'];
  const selected = CICLO_ORDER.filter((c) => raw.includes(c));
  return selected.length >= 2 ? selected : ['A', 'B', 'C'];
}

export type TreinoTipo = TreinoBase | 'custom';

export type ModoExercicio = 'tempo' | 'reps';

export type AchievementIcon =
  | 'medal'
  | 'flame'
  | 'trophy'
  | 'zap'
  | 'star'
  | 'target'
  | 'crown'
  | 'sun'
  | 'moon'
  | 'calendar'
  | 'clock'
  | 'gem'
  | 'rocket'
  | 'dumbbell'
  | 'heart'
  | 'shield';

export type AchievementDifficulty = 'facil' | 'media' | 'dificil' | 'lendaria';

export interface AchievementDefinition {
  id: string;
  titulo: string;
  icon: AchievementIcon;
  descricao: string;
  dificuldade: AchievementDifficulty;
  /** Percentual fictício de jogadores com a conquista (substituir por dado real depois). */
  pct_jogadores: number;
}

export interface ExerciseMedia {
  gif: string;
  video?: string;
}

export interface ExerciseLevelParams {
  repeticoes_iniciante: number;
  repeticoes_intermediario: number;
  repeticoes_avancado: number;
  tempo_seg_iniciante: number;
  tempo_seg_intermediario: number;
  tempo_seg_avancado: number;
  descanso_seg_iniciante: number;
  descanso_seg_intermediario: number;
  descanso_seg_avancado: number;
}

export interface IExercise extends ExerciseLevelParams {
  slug: string;
  nome: string;
  nome_pt?: string;
  nivel: 1 | 2 | 3 | 4;
  musculo_principal: MusculoPrincipal;
  musculos_secundarios?: MusculoPrincipal[];
  tempo_recomendado: number;
  prioridade: Prioridade;
  modo: ModoExercicio | 'ambos';
  descricao?: string;
  media: ExerciseMedia;
  ativo: boolean;
}

export interface UserPreferencias {
  descanso_padrao_seg: number;
  som_habilitado: boolean;
  sfx_volume: number;
  ciclo_treinos: TreinoBase[];
  modo_padrao: ModoExercicio;
  reps_series_padrao?: number;
  reps_repeticoes_padrao?: number;
  preset_favorito_id?: string | null;
  tutorial_visto: boolean;
  /** Estilo de combate na patrulha AFK. */
  arma_preferida?: ArmaPreferida | null;
  /** Arcos e espadas desbloqueados na loja da patrulha. */
  patrol_armas?: import('../patrol/shop.js').PatrolArmasState;
  /** Não exibir aviso de teto diário de XP ao iniciar treino. */
  ocultar_aviso_xp_diario?: boolean;
  /** Slugs sempre incluídos nos treinos sugeridos. */
  exercicios_fixos?: string[];
  /** Slugs excluídos das recomendações. */
  exercicios_nao_recomendar?: string[];
  /** Controle de rodada por ciclo (A, B, C…). */
  ciclos_completados_rodada?: Partial<Record<TreinoBase, boolean>>;
}

export type ArmaPreferida = 'arco' | 'espada';

export type InventoryItemId = 'energy_drink' | 'bau_patrulha';

export interface InventoryEntry {
  item_id: InventoryItemId;
  quantidade: number;
}

export interface Inventario {
  itens: InventoryEntry[];
}

export interface AfkPendingReward {
  xp: number;
  abdoria: number;
  energy_drinks: number;
  cosmetic_ids: string[];
  titulo_secreto: boolean;
}

export interface AfkState {
  last_seen_at: string | null;
  minutos_acumulados: number;
  pending: AfkPendingReward;
  combat?: AfkCombatState;
  /** Presente na resposta de stats/meta quando há loot para coletar. */
  has_rewards?: boolean;
}

export type {
  AfkCombatState,
  AfkCombatSnapshot,
  AfkEnemyId,
  AfkEnemyTier,
} from '../afk/combat.js';

export type {
  SlimeEyeStyle,
  SlimeMouthStyle,
  SlimeExtraAccessory,
  SlimeAccessoryKind,
  SlimeAppearance,
} from '../afk/slime-appearance.js';

export {
  AFK_BOSS_INTERVAL,
  AFK_ENEMIES,
  AFK_CRIT_CHANCE,
  AFK_CRIT_DAMAGE,
  AFK_GOLDEN_SLIME_ABDORIA,
  AFK_GOLDEN_SLIME_CHANCE,
  AFK_HERO_DAMAGE_ARCO,
  AFK_HERO_DAMAGE_ESPADA,
  AFK_KILLS_PER_MINUTE,
  AFK_LEGENDARY_ROLL_BOSS,
  AFK_LEGENDARY_ROLL_NORMAL,
  DEFAULT_AFK_COMBAT,
  buildCombatSnapshot,
  getEnemyMaxHp,
  hashCombatSeed,
  pickNextEnemy,
  resolveNextSpawn,
  advanceKillsUntilBoss,
  shouldSpawnBoss,
  shouldSpawnElite,
  shouldSpawnGoldenSlime,
} from '../afk/combat.js';

export {
  resolveSlimeAppearance,
  collectSlimeAccessories,
  accessoryDropMotion,
} from '../afk/slime-appearance.js';

export interface XpDiario {
  /** XP de exercícios hoje (teto padrão/dia). */
  ganho_hoje: number;
  /** XP bônus hoje (streak, conquistas, loja, habilidades — sem teto). */
  extra_hoje: number;
  data_reset: string;
  /** XP restante do bônus Energy Drink (+100 por uso). */
  bonus_pool_restante: number;
  /** Capacidade total do bônus ativo (para barra de progresso). */
  bonus_pool_total: number;
}

export interface Gamificacao {
  nivel_xp: number;
  streak_atual: number;
  streak_maior: number;
  total_minutos: number;
  conquistas: string[];
}

export type CosmeticKind = 'avatar' | 'borda' | 'titulo' | 'som' | 'efeito' | 'fundo';

export type CosmeticUnlockType = 'gratis' | 'nivel' | 'conquista' | 'moedas' | 'codigo';

export type CosmeticRarity = 'comum' | 'raro' | 'epico' | 'lendario';

export type DailyRewardRarity = 'comum' | 'incomum' | 'raro' | 'epico';

export type DailyRewardType = 'xp' | 'abdoria' | 'pacote' | 'item';

export type DailyShopPaidOfferKind = 'surto_xp' | 'bolsa_abdoria' | 'pacote_misto';

export type DailyShopSlotKind = 'recompensa_diaria' | 'oferta';

export type CosmeticAvatarIcon = AchievementIcon | 'letter';

export interface CosmeticUnlockRule {
  tipo: CosmeticUnlockType;
  nivel_min?: number;
  conquista_id?: string;
  preco_moedas?: number;
}

export interface CosmeticDefinition {
  id: string;
  kind: CosmeticKind;
  nome: string;
  descricao: string;
  icon: CosmeticAvatarIcon;
  raridade: CosmeticRarity;
  unlock: CosmeticUnlockRule;
}

export interface Cosmeticos {
  /** Saldo da moeda Abdoria. */
  moedas: number;
  /** Blocos de XP já convertidos em Abdoria. */
  moedas_xp_blocos: number;
  avatar_equipado: string;
  borda_equipada: string;
  titulo_equipado: string | null;
  som_equipado: string;
  efeito_equipado: string;
  fundo_equipado: string;
  desbloqueados: string[];
  codigos_resgatados: string[];
}

export interface LojaDiariaSlot {
  slot: number;
  kind: DailyShopSlotKind;
  recompensa_tipo: DailyRewardType;
  valor: number;
  raridade: DailyRewardRarity;
  preco_abdoria: number;
  /** Custo em XP (progresso do nível) para ofertas de Abdoria ou pacotes mistos. */
  preco_xp?: number;
  resgatado: boolean;
  label: string;
  /** Nome curto da oferta paga (slots 1 e 2). */
  oferta_nome?: string;
  bonus_xp?: number;
  bonus_abdoria?: number;
  /** Oferta de cosmético na loja diária. */
  cosmetic_id?: string;
  /** Item consumível (ex.: energy_drink). */
  item_id?: InventoryItemId;
}

export interface LojaDiaria {
  data_reset: string;
  slots: LojaDiariaSlot[];
}

export interface ShopCatalogItem extends CosmeticDefinition {
  desbloqueada: boolean;
  equipada: boolean;
  pode_comprar: boolean;
  unlock_label: string;
}

export interface CosmeticCatalogItem extends ShopCatalogItem {}

export interface ShopResponse {
  abdoria: number;
  xp_level: number;
  nivel_xp: number;
  spendable_xp: number;
  /** XP necessário para comprar 1 Abdoria na loja. */
  shop_xp_cost_per_abdoria: number;
  /** Abdoria necessária para comprar 1 XP na loja. */
  shop_abdoria_cost_per_xp: number;
  /** @deprecated Use shop_xp_cost_per_abdoria */
  xp_to_abdoria_rate: number;
  /** @deprecated Use shop_abdoria_cost_per_xp */
  abdoria_to_xp_rate: number;
  /** Abdoria passiva a cada N XP totais. */
  abdoria_por_xp: number;
  avatar_equipado: string;
  borda_equipada: string;
  titulo_equipado: string | null;
  som_equipado: string;
  efeito_equipado: string;
  fundo_equipado: string;
  avatares: ShopCatalogItem[];
  bordas: ShopCatalogItem[];
  titulos: ShopCatalogItem[];
  sons: ShopCatalogItem[];
  efeitos: ShopCatalogItem[];
  fundos: ShopCatalogItem[];
  loja_diaria: LojaDiaria;
}

export interface CosmeticsResponse extends ShopResponse {
  moedas: number;
  moedas_por_nivel: number;
}

export type {
  PatrolWeaponKind,
  PatrolWeaponRarity,
  PatrolWeaponUnlock,
  PatrolWeaponDefinition,
  PatrolArmasState,
} from '../patrol/shop.js';

export {
  DEFAULT_ARCO_ID,
  DEFAULT_ESPADA_ID,
  PATROL_WEAPONS,
  PATROL_WEAPON_BY_ID,
  PATROL_WEAPON_RARITY_LABELS,
  patrolWeaponsByKind,
  patrolHeroDamage,
  resolvePatrolArmas,
} from '../patrol/shop.js';

export interface PatrolShopCatalogItem {
  id: string;
  kind: import('../patrol/shop.js').PatrolWeaponKind;
  nome: string;
  descricao: string;
  raridade: import('../patrol/shop.js').PatrolWeaponRarity;
  desbloqueada: boolean;
  equipada: boolean;
  pode_comprar: boolean;
  futuro: boolean;
  unlock_label: string;
  unlock: import('../patrol/shop.js').PatrolWeaponUnlock;
  dano_bonus: number;
  dano_total: number;
}

export interface PatrolShopResponse {
  abdoria: number;
  armas: import('../patrol/shop.js').PatrolArmasState;
  arma_preferida: ArmaPreferida;
  arcos: PatrolShopCatalogItem[];
  espadas: PatrolShopCatalogItem[];
}

export interface UpdateUserDadosResponse {
  user: IUserDocument;
  xp_ganho_habilidades: number;
}

export interface XpBreakdown {
  exercicios: number;
  streak: number;
  conquistas: number;
  total_diario: number;
  total_extra: number;
  total_bruto: number;
  aplicado_diario: number;
  aplicado_extra: number;
  aplicado: number;
}

export interface GiftCodeRewardLine {
  tipo: 'xp' | 'abdoria' | 'cosmetico';
  valor?: number;
  nome?: string;
  item_id?: string;
}

export interface RedeemCodeResponse {
  user: IUserDocument;
  codigo: string;
  xp_ganho: number;
  abdoria_ganha: number;
  itens_desbloqueados: string[];
  titulo?: string;
  mensagem?: string;
  recompensas: GiftCodeRewardLine[];
}

export interface PurchaseCosmeticResponse {
  user: IUserDocument;
  item: CosmeticCatalogItem;
  moedas_gastas: number;
}

export interface EquipCosmeticResponse {
  user: IUserDocument;
  item: CosmeticCatalogItem;
}

export const XP_DAILY_CAP_BASE = 100;
/** Bônus de teto diário por nível de gamificação (+1 XP por nível). */
export const XP_DAILY_CAP_PER_LEVEL = 1;
/** Limite diário no nível 1 (base + 1× bônus). */
export const XP_DAILY_CAP = XP_DAILY_CAP_BASE + XP_DAILY_CAP_PER_LEVEL;
/** @deprecated Conquistas não aumentam mais o teto diário. */
export const XP_DAILY_CAP_PER_ACHIEVEMENT = 0;
/** XP diário por exercício concluído (treino com mín. 3 exercícios). */
export const XP_DAILY_PER_EXERCISE = 20;
/** Mínimo de exercícios no treino para contar XP diário. */
export const XP_DAILY_MIN_EXERCISES = 3;
/** Exercícios para encher o teto no nível 1 (6 × 20 = 120 com bônus de nível 1). */
export const XP_DAILY_FULL_EXERCISES = Math.ceil(
  (XP_DAILY_CAP_BASE + XP_DAILY_CAP_PER_LEVEL) / XP_DAILY_PER_EXERCISE,
);

export function dailyXpCapForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return XP_DAILY_CAP_BASE + safeLevel * XP_DAILY_CAP_PER_LEVEL;
}

export function dailyFullExercisesForCap(cap: number): number {
  return Math.ceil(Math.max(0, cap) / XP_DAILY_PER_EXERCISE);
}

export function dailyXpCap(_unlockedAchievementCount = 0, level = 1): number {
  void _unlockedAchievementCount;
  return dailyXpCapForLevel(level);
}
export const XP_STREAK_BONUS_PER_DAY = 1;
export const XP_STREAK_BONUS_MAX = 32;
export const XP_ACHIEVEMENT_BONUS = 1;
/** @deprecated Use XP_DAILY_PER_EXERCISE for daily exercise XP. */
export const XP_WORKOUT_BASE = 0;
/** @deprecated Use XP_DAILY_PER_EXERCISE for daily exercise XP. */
export const XP_PER_EXERCISE = XP_DAILY_PER_EXERCISE;
export const XP_PER_SKILL_UNLOCK = 1;
/** Loja: comprar 1 Abdoria custa N XP (progresso do nível). */
export const SHOP_XP_COST_PER_ABDORIA = 25;
/** Loja: comprar 1 XP custa N Abdoria. */
export const SHOP_ABDORIA_COST_PER_XP = 5;
/** Abdoria passiva: 1 moeda a cada N XP totais ganhos. */
export const ABDORIA_XP_STEP = 10;
export const CURRENCY_NAME = 'Abdoria coins';

export const ENERGY_DRINK_ITEM_ID: InventoryItemId = 'energy_drink';
export const ENERGY_DRINK_BONUS_XP = 100;
export const ENERGY_DRINK_SHOP_PRICE = 20;
export const PATROL_CACHE_ITEM_ID: InventoryItemId = 'bau_patrulha';
/** Horas de patrulha AFK concedidas ao usar o baú. */
export const PATROL_CACHE_HOURS = 6;
export const PATROL_CACHE_SHOP_PRICE = 50;
export const PATROL_CACHE_LABEL = 'Baú da Patrulha';
/** @deprecated Loot não é mais por intervalo de tempo — use AFK_KILL_DROP_CHANCE_COMMON. */
export const AFK_REWARD_INTERVAL_MINUTES = 15;
export const AFK_KILL_DROP_CHANCE_COMMON = 4;
export const AFK_KILL_DROP_CHANCE_ELITE = 6;
export const AFK_KILL_DROP_CHANCE_BOSS = 10;
/** @deprecated use tier-specific constants */
export const AFK_KILL_DROP_CHANCE = AFK_KILL_DROP_CHANCE_COMMON;
export const AFK_MAX_MINUTES = 24 * 60;

export interface AfkKillDropChances {
  common: number;
  elite: number;
  boss: number;
}

export const AFK_KILL_DROP_CHANCES: AfkKillDropChances = {
  common: AFK_KILL_DROP_CHANCE_COMMON,
  elite: AFK_KILL_DROP_CHANCE_ELITE,
  boss: AFK_KILL_DROP_CHANCE_BOSS,
};

export const DEFAULT_INVENTARIO: Inventario = { itens: [] };

export const DEFAULT_AFK_STATE: AfkState = {
  last_seen_at: null,
  minutos_acumulados: 0,
  pending: { xp: 0, abdoria: 0, energy_drinks: 0, cosmetic_ids: [], titulo_secreto: false },
  combat: { ...DEFAULT_AFK_COMBAT },
};

export const DEFAULT_XP_DIARIO: XpDiario = {
  ganho_hoje: 0,
  extra_hoje: 0,
  data_reset: '',
  bonus_pool_restante: 0,
  bonus_pool_total: 0,
};

/** @deprecated Use SHOP_XP_COST_PER_ABDORIA */
export const XP_TO_ABDORIA_RATE = SHOP_XP_COST_PER_ABDORIA;
/** @deprecated Use SHOP_ABDORIA_COST_PER_XP */
export const ABDORIA_TO_XP_RATE = SHOP_ABDORIA_COST_PER_XP;

/** @deprecated Use ABDORIA_XP_STEP */
export const COINS_PER_LEVEL = ABDORIA_XP_STEP;

export function abdoriaCostForXpReward(xpAmount: number): number {
  return Math.max(1, Math.ceil(xpAmount * SHOP_ABDORIA_COST_PER_XP));
}

export function xpCostForAbdoriaReward(abdoriaAmount: number): number {
  return Math.max(1, Math.ceil(abdoriaAmount * SHOP_XP_COST_PER_ABDORIA));
}

/** Estima Abdoria restante após gastar XP na loja (conversão passiva por blocos). */
export function projectedAbdoriaAfterXpSpend(
  nivelXp: number,
  moedas: number,
  moedasXpBlocos: number,
  xpCost: number,
): number {
  if (xpCost <= 0) return moedas;
  const nextTotal = Math.max(0, nivelXp - xpCost);
  const newBlocks = Math.floor(nextTotal / ABDORIA_XP_STEP);
  const clawback = Math.max(0, moedasXpBlocos - newBlocks);
  return Math.max(0, moedas - clawback);
}

export const DAILY_RARITY_LABELS: Record<DailyRewardRarity, string> = {
  comum: 'Comum',
  incomum: 'Incomum',
  raro: 'Raro',
  epico: 'Épico',
};

export const DAILY_LUCK_LABELS: Partial<Record<DailyRewardRarity, string>> = {
  raro: 'Sorte grande!',
  epico: 'Jackpot! Sorte épica!',
};

export const DAILY_PAID_OFFER_LABELS: Record<DailyShopPaidOfferKind, string> = {
  surto_xp: 'Surto de XP',
  bolsa_abdoria: 'Bolsa Abdoria',
  pacote_misto: 'Pacote misto',
};

export const DEFAULT_COSMETICOS: Cosmeticos = {
  moedas: 0,
  moedas_xp_blocos: 0,
  avatar_equipado: 'avatar_inicial',
  borda_equipada: 'borda_basica',
  titulo_equipado: null,
  som_equipado: 'som_classico',
  efeito_equipado: 'efeito_padrao',
  fundo_equipado: 'fundo_padrao',
  desbloqueados: ['avatar_inicial', 'borda_basica', 'som_classico', 'efeito_padrao', 'fundo_padrao'],
  codigos_resgatados: [],
};

export const COSMETIC_RARITY_LABELS: Record<CosmeticRarity, string> = {
  comum: 'Comum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
};

export function resolveCosmeticos(
  cosmeticos?: Partial<Cosmeticos> | null,
  nivelXp = 0,
): Cosmeticos {
  const merged = {
    ...DEFAULT_COSMETICOS,
    ...cosmeticos,
    desbloqueados: cosmeticos?.desbloqueados?.length
      ? [...new Set([...DEFAULT_COSMETICOS.desbloqueados, ...cosmeticos.desbloqueados])]
      : [...DEFAULT_COSMETICOS.desbloqueados],
    codigos_resgatados: cosmeticos?.codigos_resgatados ?? [],
  };

  if (merged.moedas_xp_blocos === 0 && nivelXp > 0 && !cosmeticos?.moedas_xp_blocos) {
    merged.moedas_xp_blocos = Math.floor(nivelXp / ABDORIA_XP_STEP);
  }

  return merged;
}

export function streakXpBonus(streakAtual: number): number {
  if (streakAtual <= 0) return 0;
  return Math.min(streakAtual * XP_STREAK_BONUS_PER_DAY, XP_STREAK_BONUS_MAX);
}

export type SexoBiologico = 'masculino' | 'feminino';

export interface SimulacaoDefinicao {
  gordura_atual_pct?: number;
  gordura_meta_pct: number;
  /** Baseline registrado na primeira medição — usado no progresso. */
  gordura_inicio_pct?: number;
  sexo?: SexoBiologico;
  atualizado_em?: string;
}

export interface IUser {
  email: string;
  nome: string;
  idade?: number;
  peso_kg?: number;
  altura_cm?: number;
  imc?: number;
  nivel: NivelUsuario;
  objetivo: Objetivo;
  gamificacao: Gamificacao;
  cosmeticos: Cosmeticos;
  loja_diaria?: LojaDiaria;
  simulacao_definicao?: SimulacaoDefinicao;
  preferencias: UserPreferencias;
  dados_salvos?: UserDadosSalvos;
  xp_diario: XpDiario;
  inventario?: Inventario;
  afk?: AfkState;
  onboarding_completed: boolean;
    terms_accepted_at?: string | null;
    muscle_map_reset_at?: string | null;
    is_guest?: boolean;
}

export interface IUserDocument extends IUser {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IExerciseDocument extends IExercise {
  id: string;
}

export interface WorkoutExerciseEntry {
  exercicio_id: string;
  slug: string;
  nome: string;
  duracao_segundos: number;
  musculo_principal: MusculoPrincipal;
  series?: number;
  repeticoes_realizadas?: number;
  modo?: ModoExercicio;
  descanso_seg?: number;
}

export interface IWorkoutHistory {
  usuario_id: string;
  treino_nome: string;
  treino_tipo?: TreinoTipo;
  exercicios: WorkoutExerciseEntry[];
  duracao_total_segundos: number;
  musculos_estimulados: MusculoPrincipal[];
  xp_ganho?: number;
  concluido_em: Date;
}

export interface IWorkoutHistoryDocument extends IWorkoutHistory {
  id: string;
}

export interface Achievement extends AchievementDefinition {
  desbloqueada: boolean;
}

export interface TreinoSugeridoExercicio {
  slug: string;
  nome: string;
  series: number;
  modo: ModoExercicio;
  repeticoes?: number;
  tempo_seg?: number;
  descanso_seg: number;
}

export interface TreinoSugerido {
  preset_id: string;
  ciclo_id: TreinoBase;
  nome: string;
  descricao: string;
  total_exercicios: number;
  exercicios: TreinoSugeridoExercicio[];
  primeiro_exercicio: string | null;
}

export interface RepSchemeRecommendation {
  id: string;
  label: string;
  series: number;
  repeticoes: number;
  descricao: string;
}

export interface RecommendationAlert {
  id: string;
  tipo: 'troca_treino' | 'desbalanceamento' | 'foco_musculo';
  titulo: string;
  mensagem: string;
}

export interface DashboardStats {
  treino_hoje: boolean;
  proximo_treino: string;
  treino_sugerido: TreinoSugerido | null;
  alertas_recomendacao?: RecommendationAlert[];
  total_segundos: number;
  total_minutos: number;
  streak_atual: number;
  streak_maior: number;
  nivel_xp: number;
  xp_hoje: number;
  xp_extra_hoje: number;
  xp_diario_limite: number;
  xp_bonus_restante: number;
  xp_bonus_total: number;
  xp_data_reset: string;
  inventario: Inventario;
  afk: AfkState;
  energy_drink_count: number;
  patrol_cache_count: number;
  conquistas: Achievement[];
  musculos_semana: Record<MusculoPrincipal, number>;
  evolucao_mensal: { mes: string; minutos: number }[];
  area_mais_treinada: MusculoPrincipal | null;
  area_menos_treinada: MusculoPrincipal | null;
  total_exercicios: number;
}

export interface ExerciseFilters {
  musculo?: string;
  nivel?: number;
  prioridade?: string;
}

export interface StreakCelebration {
  streak_atual: number;
  streak_anterior: number;
}

export interface LevelUpCelebration {
  level_anterior: number;
  level_novo: number;
}

export interface CompleteWorkoutResponse {
  history: IWorkoutHistoryDocument;
  user: IUserDocument;
  xp_ganho: number;
  abdoria_ganha?: number;
  /** @deprecated Use abdoria_ganha */
  moedas_ganhas?: number;
  xp_breakdown?: XpBreakdown;
  streak_celebration: StreakCelebration | null;
  level_up: LevelUpCelebration | null;
  rodada_completa?: boolean;
}

export interface CompleteWorkoutPayload {
  treino_nome: string;
  treino_tipo?: TreinoTipo;
  exercicios: WorkoutExerciseEntry[];
  duracao_total_segundos: number;
}

export interface WorkoutQueueItem {
  slug: string;
  nome: string;
  nome_pt?: string;
  exercicio_id?: string;
  musculo_principal: MusculoPrincipal;
  tempo_recomendado: number;
  modo: ModoExercicio;
  series: number;
  repeticoes?: number;
  tempo_seg?: number;
  descanso_seg: number;
}

export interface StoredRepScheme extends RepSchemeRecommendation {
  isCustom: boolean;
}

export interface SavedWorkoutPreset {
  id: string;
  nome: string;
  queue: WorkoutQueueItem[];
  descanso_padrao_seg: number;
  savedAt: string;
}

export interface UserDadosSalvos {
  treino_personalizado: WorkoutQueueItem[];
  treinos_salvos: SavedWorkoutPreset[];
  esquemas_reps: Partial<Record<NivelUsuario, StoredRepScheme[]>>;
  exercicios_desbloqueados: string[];
}

export const DEFAULT_USER_DADOS_SALVOS: UserDadosSalvos = {
  treino_personalizado: [],
  treinos_salvos: [],
  esquemas_reps: {},
  exercicios_desbloqueados: [],
};

export function resolveUserDadosSalvos(dados?: Partial<UserDadosSalvos> | null): UserDadosSalvos {
  const esquemas = dados?.esquemas_reps;
  return {
    treino_personalizado: dados?.treino_personalizado ?? [],
    treinos_salvos: dados?.treinos_salvos ?? [],
    esquemas_reps: esquemas ? { ...esquemas } : {},
    exercicios_desbloqueados: dados?.exercicios_desbloqueados ?? [],
  };
}

export function mergeUserDadosSalvos(
  current: UserDadosSalvos,
  patch: Partial<UserDadosSalvos>,
): UserDadosSalvos {
  return {
    treino_personalizado: patch.treino_personalizado ?? current.treino_personalizado,
    treinos_salvos: patch.treinos_salvos ?? current.treinos_salvos,
    esquemas_reps: patch.esquemas_reps
      ? { ...current.esquemas_reps, ...patch.esquemas_reps }
      : current.esquemas_reps,
    exercicios_desbloqueados: patch.exercicios_desbloqueados ?? current.exercicios_desbloqueados,
  };
}

export const SAVED_PRESET_PREFIX = 'saved:';

export function isSavedPresetId(id: string): boolean {
  return id.startsWith(SAVED_PRESET_PREFIX);
}

export function toSavedPresetId(id: string): string {
  return `${SAVED_PRESET_PREFIX}${id}`;
}

export function fromSavedPresetId(id: string): string {
  return id.slice(SAVED_PRESET_PREFIX.length);
}

export function savedWorkoutSummary(preset: SavedWorkoutPreset): string {
  const count = preset.queue.length;
  const reps = preset.queue.filter((item) => item.modo === 'reps' || !item.modo).length;
  return `${count} exercícios${reps > 0 ? ` · ${reps} com repetições` : ''}`;
}

export interface ActiveWorkoutConfig {
  descanso_padrao_seg: number;
}

export interface ActiveWorkout {
  treino_nome: string;
  treino_tipo: TreinoTipo;
  queue: WorkoutQueueItem[];
  config: ActiveWorkoutConfig;
  preset_id?: string;
}

export interface PresetExercise {
  slug: string;
  series: number;
  modo: ModoExercicio;
  tempo_seg?: number;
  repeticoes?: number;
  descanso_seg: number;
}

export interface IWorkoutPreset {
  nome: string;
  nivel: NivelUsuario;
  objetivo: Objetivo;
  ciclo_id: TreinoBase;
  descricao: string;
  recomendado: boolean;
  exercicios: PresetExercise[];
}

export interface IWorkoutPresetDocument extends IWorkoutPreset {
  id: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  nome: string;
  nivel_xp: number;
  level: number;
  streak_atual: number;
  moedas: number;
  avatar_equipado: string;
  borda_equipada: string;
  is_me?: boolean;
}

export type LeaderboardMetric = 'xp' | 'streak' | 'moedas';

export const LEADERBOARD_DISPLAY_LIMIT = 25;

export interface AuthResponse {
  token: string;
  user: IUserDocument;
}

export interface OnboardingPayload {
  nome?: string;
  idade?: number;
  peso_kg?: number;
  altura_cm?: number;
  nivel?: NivelUsuario;
  objetivo?: Objetivo;
  preferencias?: Partial<UserPreferencias>;
  terms_accepted?: boolean;
  onboarding_completed?: boolean;
  simulacao_definicao?: SimulacaoDefinicao;
  skip?: boolean;
}

/** Rótulos das zonas abdominais (não confundir com peito/costas de musculação). */
export const MUSCULO_LABELS: Record<MusculoPrincipal, string> = {
  superior: 'Abdômen superior',
  inferior: 'Abdômen inferior',
  obliquos: 'Oblíquos',
  core: 'Core (estabilidade)',
  completo: 'Corpo inteiro',
};

export const MUSCULO_HINTS: Record<MusculoPrincipal, string> = {
  superior: 'Parte alta do reto abdominal — crunch, sit-up. Não é peito.',
  inferior: 'Parte baixa do abdômen — elevações de pernas e reverse crunch.',
  obliquos: 'Laterais do tronco — rotações, bicicleta e prancha lateral.',
  core: 'Estabilização profunda — prancha, dead bug e antebraço.',
  completo: 'Circuitos que combinam várias zonas do abdômen e condicionamento.',
};

export const PRIORIDADE_LABELS: Record<Prioridade, string> = {
  S: 'Prioridade S',
  A: 'Prioridade A',
  B: 'Prioridade B',
  C: 'Prioridade C',
  dinamico: 'Dinâmico',
  isometrico: 'Isométrico',
};

export const NIVEL_LABELS: Record<NivelUsuario, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};

export const OBJETIVO_LABELS: Record<Objetivo, string> = {
  definicao: 'Definição',
  resistencia: 'Resistência',
  forca: 'Força',
  manutencao: 'Bem-estar',
};

export const OBJETIVO_HINTS: Record<Objetivo, string> = {
  definicao: 'Tonificar o abdômen e reduzir gordura',
  resistencia: 'Aguentar treinos por mais tempo',
  forca: 'Exercícios mais intensos e progressivos',
  manutencao: 'Manter o hábito e o condicionamento',
};

export const ACHIEVEMENT_DIFFICULTY_LABELS: Record<AchievementDifficulty, string> = {
  facil: 'Fácil',
  media: 'Média',
  dificil: 'Difícil',
  lendaria: 'Lendária',
};

export const ACHIEVEMENT_DIFFICULTY_ORDER: Record<AchievementDifficulty, number> = {
  facil: 0,
  media: 1,
  dificil: 2,
  lendaria: 3,
};

export function formatAchievementPlayerPct(pct: number): string {
  if (pct >= 1) return `${Math.round(pct)}%`;
  if (pct >= 0.1) return `${pct.toFixed(1).replace('.', ',')}%`;
  return `${pct.toFixed(2).replace('.', ',')}%`;
}

export function formatExercisePrescription(item: {
  modo: ModoExercicio;
  series: number;
  repeticoes?: number;
  tempo_seg?: number;
  tempo_recomendado?: number;
}): string {
  if (item.modo === 'reps') {
    return `${item.repeticoes ?? 12} reps × ${item.series} séries`;
  }
  const secs = item.tempo_seg ?? item.tempo_recomendado ?? 30;
  return `${secs}s × ${item.series} séries`;
}

/** Prêmios semanais de XP (pago todo domingo). */
export function weeklyLeaderboardReward(rank: number): number | null {
  if (rank === 1) return 15;
  if (rank === 2) return 10;
  if (rank === 3) return 5;
  if (rank <= 25) return 3;
  return null;
}

export const REP_SCHEME_BY_NIVEL: Record<NivelUsuario, RepSchemeRecommendation[]> = {
  iniciante: [
    { id: 'vol-12x3', label: '12 × 3', series: 3, repeticoes: 12, descricao: 'Volume clássico — ideal para começar' },
    { id: 'vol-10x3', label: '10 × 3', series: 3, repeticoes: 10, descricao: 'Controle e forma antes da carga' },
    { id: 'end-15x3', label: '15 × 3', series: 3, repeticoes: 15, descricao: 'Resistência com volume equilibrado' },
  ],
  intermediario: [
    { id: 'vol-14x3', label: '14 × 3', series: 3, repeticoes: 14, descricao: 'Volume moderado-alto' },
    { id: 'vol-12x4', label: '12 × 4', series: 4, repeticoes: 12, descricao: 'Mais séries, mesmo volume por série' },
    { id: 'end-16x3', label: '16 × 3', series: 3, repeticoes: 16, descricao: 'Foco em resistência muscular' },
  ],
  avancado: [
    { id: 'for-8x4', label: '8 × 4', series: 4, repeticoes: 8, descricao: 'Força e densidade' },
    { id: 'for-10x5', label: '10 × 5', series: 5, repeticoes: 10, descricao: 'Alto volume total por exercício' },
    { id: 'vol-12x3', label: '12 × 3', series: 3, repeticoes: 12, descricao: 'Manutenção técnica com volume' },
  ],
};

export const DEFAULT_PREFERENCIAS: UserPreferencias = {
  descanso_padrao_seg: 30,
  som_habilitado: true,
  sfx_volume: 0.7,
  ciclo_treinos: ['A', 'B', 'C'],
  modo_padrao: 'tempo',
  reps_series_padrao: 3,
  reps_repeticoes_padrao: 12,
  preset_favorito_id: null,
  tutorial_visto: false,
  arma_preferida: null,
  ocultar_aviso_xp_diario: false,
  exercicios_fixos: [],
  exercicios_nao_recomendar: [],
  ciclos_completados_rodada: {},
};

export function calcImc(pesoKg: number, alturaCm: number): number {
  const h = alturaCm / 100;
  return Math.round((pesoKg / (h * h)) * 10) / 10;
}

export const DEFINICAO_META_PADRAO: Record<SexoBiologico, number> = {
  masculino: 12,
  feminino: 19,
};

export interface GorduraFaixa {
  id: string;
  label: string;
  descricao: string;
  min: number;
  max: number;
}

export const GORDURA_FAIXAS: Record<SexoBiologico, GorduraFaixa[]> = {
  masculino: [
    { id: 'atleta', label: 'Atleta', descricao: 'Abdômen muito definido, vascularização visível.', min: 6, max: 10 },
    { id: 'definido', label: 'Definido', descricao: 'Six-pack visível com boa iluminação.', min: 10, max: 14 },
    { id: 'atletico', label: 'Atlético', descricao: 'Contorno abdominal perceptível.', min: 14, max: 18 },
    { id: 'medio', label: 'Médio', descricao: 'Pouca definição; foco em consistência.', min: 18, max: 25 },
    { id: 'acima', label: 'Acima', descricao: 'Priorize hábito, sono e déficit calórico leve.', min: 25, max: 60 },
  ],
  feminino: [
    { id: 'atleta', label: 'Atleta', descricao: 'Definição alta com pouca gordura essencial.', min: 14, max: 18 },
    { id: 'definido', label: 'Definido', descricao: 'Linha do abdômen visível.', min: 18, max: 22 },
    { id: 'atletico', label: 'Atlético', descricao: 'Formato tonificado, definição parcial.', min: 22, max: 28 },
    { id: 'medio', label: 'Médio', descricao: 'Zona comum; treino + alimentação aceleram.', min: 28, max: 35 },
    { id: 'acima', label: 'Acima', descricao: 'Comece com volume moderado e constância.', min: 35, max: 60 },
  ],
};

export function getDefinicaoMetaPadrao(sexo: SexoBiologico = 'masculino'): number {
  return DEFINICAO_META_PADRAO[sexo];
}

export function getGorduraFaixa(pct: number, sexo: SexoBiologico = 'masculino'): GorduraFaixa {
  const faixas = GORDURA_FAIXAS[sexo];
  return faixas.find((f) => pct >= f.min && pct < f.max) ?? faixas[faixas.length - 1];
}

/** Estimativa educativa (fórmula de Deurenberg) — não substitui bioimpedância ou adipômetro. */
export function estimarGorduraCorporal(
  imc: number,
  idade: number,
  sexo: SexoBiologico,
): number {
  const sex = sexo === 'masculino' ? 1 : 0;
  const raw = 1.2 * imc + 0.23 * idade - 10.8 * sex - 5.4;
  return Math.round(Math.min(55, Math.max(8, raw)) * 10) / 10;
}

export function calcKgParaMeta(
  pesoKg: number,
  gorduraAtualPct: number,
  gorduraMetaPct: number,
): number {
  if (gorduraAtualPct <= gorduraMetaPct) return 0;
  const massaMagra = pesoKg * (1 - gorduraAtualPct / 100);
  const pesoMeta = massaMagra / (1 - gorduraMetaPct / 100);
  return Math.round(Math.max(0, pesoKg - pesoMeta) * 10) / 10;
}

export function calcProgressoDefinicao(
  atual: number,
  meta: number,
  inicio?: number,
): number {
  if (atual <= meta) return 100;
  const base = inicio ?? atual;
  if (base <= meta) return 0;
  const pct = ((base - atual) / (base - meta)) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}

export interface ProjecaoDefinicaoSemanas {
  otimista: number;
  realista: number;
  conservador: number;
}

export function estimarSemanasParaMeta(
  diffPct: number,
  context: { treinosSemana: number; streakAtual: number; nivel: NivelUsuario },
): ProjecaoDefinicaoSemanas {
  if (diffPct <= 0) return { otimista: 0, realista: 0, conservador: 0 };

  let perdaSemanal = 0.3;
  if (context.treinosSemana >= 5) perdaSemanal += 0.12;
  else if (context.treinosSemana >= 3) perdaSemanal += 0.08;
  else if (context.treinosSemana >= 1) perdaSemanal += 0.04;
  if (context.streakAtual >= 14) perdaSemanal += 0.06;
  else if (context.streakAtual >= 7) perdaSemanal += 0.03;
  if (context.nivel === 'avancado') perdaSemanal += 0.04;
  else if (context.nivel === 'intermediario') perdaSemanal += 0.02;

  return {
    otimista: Math.max(1, Math.ceil(diffPct / (perdaSemanal + 0.12))),
    realista: Math.max(1, Math.ceil(diffPct / perdaSemanal)),
    conservador: Math.max(1, Math.ceil(diffPct / Math.max(0.12, perdaSemanal - 0.1))),
  };
}

export function getDefinicaoDicas(faixaId: string, diffPct: number | null): string[] {
  const base = [
    'Combine treinos de abdômen com caminhada ou cardio leve 2–3× por semana.',
    'Priorize proteína e sono — definição depende de recuperação.',
  ];
  if (diffPct != null && diffPct > 0) {
    base.unshift(`Faltam ~${diffPct.toFixed(1)} p.p. de gordura para a meta — consistência vale mais que intensidade extrema.`);
  }
  if (faixaId === 'acima' || faixaId === 'medio') {
    base.push('Evite déficit agressivo; 300–500 kcal abaixo da manutenção é mais sustentável.');
  }
  if (faixaId === 'definido' || faixaId === 'atleta') {
    base.push('Você já está numa faixa avançada — foco em manter hábito e variar estímulos.');
  }
  return base.slice(0, 3);
}

export function suggestNivel(idade: number, imc: number): NivelUsuario {
  if (idade >= 50 || imc >= 30) return 'iniciante';
  if (idade >= 35 || imc >= 25) return 'intermediario';
  return 'avancado';
}

export function getExerciseParamsForNivel(
  exercise: Pick<
    IExercise,
    | 'modo'
    | 'prioridade'
    | 'repeticoes_iniciante'
    | 'repeticoes_intermediario'
    | 'repeticoes_avancado'
    | 'tempo_seg_iniciante'
    | 'tempo_seg_intermediario'
    | 'tempo_seg_avancado'
    | 'descanso_seg_iniciante'
    | 'descanso_seg_intermediario'
    | 'descanso_seg_avancado'
  >,
  nivel: NivelUsuario,
): { modo: ModoExercicio; repeticoes: number; tempo_seg: number; descanso_seg: number } {
  const isIso = exercise.prioridade === 'isometrico' || exercise.modo === 'tempo';
  const modo: ModoExercicio = exercise.modo === 'ambos' ? (isIso ? 'tempo' : 'reps') : exercise.modo;

  const repMap = {
    iniciante: exercise.repeticoes_iniciante,
    intermediario: exercise.repeticoes_intermediario,
    avancado: exercise.repeticoes_avancado,
  };
  const tempoMap = {
    iniciante: exercise.tempo_seg_iniciante,
    intermediario: exercise.tempo_seg_intermediario,
    avancado: exercise.tempo_seg_avancado,
  };
  const descMap = {
    iniciante: exercise.descanso_seg_iniciante,
    intermediario: exercise.descanso_seg_intermediario,
    avancado: exercise.descanso_seg_avancado,
  };

  return {
    modo,
    repeticoes: repMap[nivel],
    tempo_seg: tempoMap[nivel],
    descanso_seg: descMap[nivel],
  };
}

export { EXERCISE_NOME_PT, formatExerciseName, resolveExerciseNomePt } from './exercise-display.js';
export {
  xpFloorForCurrentLevel,
  spendableXpForShop,
  xpLevelFromTotal,
  xpProgressFromTotal,
  xpRequiredForNextLevel,
  type XpLevelProgress,
} from './xp-level.js';
