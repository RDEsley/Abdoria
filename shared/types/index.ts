/**
 * Tipos de domínio compartilhados entre client e server.
 * Mantém contratos de API, exercícios, usuário e gamificação alinhados.
 */

import type { EquipmentId } from '../equipment/index.js';

export type NivelUsuario = 'iniciante' | 'intermediario' | 'avancado';

export type Objetivo = 'definicao' | 'resistencia' | 'forca' | 'manutencao';

export type MusculoPrincipal = 'superior' | 'inferior' | 'obliquos' | 'core' | 'completo';

export type Prioridade = 'S' | 'A' | 'B' | 'C' | 'dinamico' | 'isometrico';

export type TreinoBase = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export const CICLO_LABELS: Record<TreinoBase, string> = {
  A: 'Abdômen superior',
  B: 'Laterais da cintura',
  C: 'Abdômen inferior',
  D: 'Prancha e equilíbrio',
  E: 'Corpo inteiro',
  F: 'Queima rápida',
  G: 'Alongar e soltar',
};

/** Explicação curta de cada ciclo — usada nas Opções e no onboarding. */
export const CICLO_HINTS: Record<TreinoBase, string> = {
  A: 'Parte de cima da barriga',
  B: 'Oblíquos — os músculos do lado da barriga',
  C: 'Parte de baixo da barriga',
  D: 'Pranchas e exercícios de sustentação',
  E: 'Abdômen junto com o resto do corpo',
  F: 'Curto e intenso, com pouco descanso',
  G: 'Movimentos leves para soltar o corpo',
};

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

export type ExerciseLaterality = 'none' | 'per_side' | 'alternating';

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
  | 'shield'
  | 'droplet'
  | 'sparkles'
  | 'snowflake';

export type AchievementDifficulty = 'facil' | 'media' | 'dificil' | 'lendaria';

/** Catálogo estático — não sabe percentual de jogadores (isso é computado, ver `Achievement`). */
export interface AchievementDefinition {
  id: string;
  titulo: string;
  icon: AchievementIcon;
  descricao: string;
  dificuldade: AchievementDifficulty;
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
  /** Como o exercício distribui o trabalho entre os lados. Nunca inferir pelo slug no Player. */
  laterality?: ExerciseLaterality;
  /** Equipamento necessário — exercício só aparece se o usuário possuir o item. */
  equipamento?: EquipmentId | null;
  /** Partes do corpo trabalhadas (primeira = principal). Ausente = ['abdomen']. */
  grupos?: ParteCorpo[];
  /** Regiões sensíveis que excluem o exercício das recomendações. */
  contraindicacoes?: RestricaoFisica[];
}

export type UserRole = 'user' | 'moderador' | 'admin';

/** Banimento ou suspensão aplicada por moderação (modelo Discord). */
export interface Banimento {
  tipo: 'ban' | 'suspensao';
  motivo: string;
  /** ISO de término da suspensão; null = banimento permanente. */
  ate: string | null;
  aplicado_por: string;
  aplicado_em: string;
}

/** True enquanto o banimento/suspensão ainda vale. */
export function isBanimentoAtivo(banimento?: Banimento | null, now = new Date()): boolean {
  if (!banimento) return false;
  if (banimento.tipo === 'ban' || !banimento.ate) return true;
  return new Date(banimento.ate).getTime() > now.getTime();
}

export type ReportMotivo =
  'nome_ofensivo' | 'foto_inadequada' | 'trapaca' | 'assedio' | 'spam' | 'personificacao' | 'outro';

export const REPORT_MOTIVOS: ReportMotivo[] = [
  'nome_ofensivo',
  'foto_inadequada',
  'trapaca',
  'assedio',
  'spam',
  'personificacao',
  'outro',
];

export const REPORT_MOTIVO_LABELS: Record<ReportMotivo, string> = {
  nome_ofensivo: 'Nome ofensivo ou impróprio',
  foto_inadequada: 'Foto de perfil inadequada',
  trapaca: 'Trapaça ou uso de exploits',
  assedio: 'Assédio ou comportamento abusivo',
  spam: 'Spam ou conteúdo indesejado',
  personificacao: 'Está se passando por outra pessoa',
  outro: 'Outro motivo',
};

export type ReportStatus = 'pendente' | 'revisado' | 'arquivado';

export interface UserReportEntry {
  id: string;
  reporter_id: string;
  reporter_nome: string;
  reported_id: string;
  reported_nome: string;
  motivo: ReportMotivo;
  descricao: string | null;
  status: ReportStatus;
  criado_em: string;
  revisado_por: string | null;
  revisado_em: string | null;
}

export interface AppRatingEntry {
  id: string;
  user_id: string;
  nome: string;
  estrelas: number;
  comentario: string | null;
  criada_em: string;
}

export interface UserPreferencias {
  descanso_padrao_seg: number;
  som_habilitado: boolean;
  sfx_volume: number;
  /** Desativa animações de confete e celebrações com partículas. */
  confetti_animacoes_habilitadas?: boolean;
  /** Contagem 3-2-1 antes de exercícios de tempo, pra dar tempo de se posicionar. Default: true. */
  contagem_regressiva_habilitada?: boolean;
  ciclo_treinos: TreinoBase[];
  modo_padrao: ModoExercicio;
  reps_series_padrao?: number;
  reps_repeticoes_padrao?: number;
  /** Segundos padrão nos exercícios de tempo (prancha, suspensão na barra). */
  tempo_exercicio_padrao_seg?: number;
  /** true = usuário deixou reps/tempo no "Recomendado" (deriva do nível). */
  esquema_recomendado?: boolean;
  preset_favorito_id?: string | null;
  tutorial_visto: boolean;
  /** Não exibir aviso de máx. diário de XP ao iniciar treino. */
  ocultar_aviso_xp_diario?: boolean;
  /** Slugs sempre incluídos nos treinos sugeridos. */
  exercicios_fixos?: string[];
  /** Slugs excluídos das recomendações. */
  exercicios_nao_recomendar?: string[];
  /** IDs de presets sempre priorizados nas recomendações. */
  treinos_fixos?: string[];
  /** IDs de presets excluídos das recomendações. */
  treinos_nao_recomendar?: string[];
  /** Controle de rodada por ciclo (A, B, C…). */
  ciclos_completados_rodada?: Partial<Record<TreinoBase, boolean>>;
  /** Equipamentos que o usuário possui — desbloqueia exercícios gated. */
  equipamentos?: Partial<Record<EquipmentId, boolean>>;
  /** Vezes que o convite de re-onboarding foi dispensado (2+ esconde o card). */
  reonboarding_dispensado?: number;
  /** true = já avaliou o app ou pediu pra não perguntar de novo. */
  avaliacao_respondida?: boolean;
  /** true = já enviou sugestão (popup do streak 7) ou pediu pra não perguntar. */
  sugestao_respondida?: boolean;
  /** true = não voltar a oferecer o opt-in de notificações. */
  notificacoes_opt_out?: boolean;
  /** Lista ordenada de Atividades do usuário; ausente = catálogo padrão. */
  atividades?: import('../atividades.js').AtividadeExtra[];
  /** Fila de atividades do dia corrente (ver shared/atividades). */
  atividades_fila?: import('../atividades.js').AtividadesFila;
  /** Quando as atividades entram na rotina (ver shared/atividades). */
  atividades_agenda?: import('../atividades.js').AtividadesAgenda;
  /** Só admins: true = aparecer nos rankings (padrão: oculto). */
  admin_visivel_ranking?: boolean;
  /** Idioma da interface. Só 'pt' tem conteúdo hoje — campo já existe pra
      quando inglês/espanhol chegarem, sem precisar de migração. */
  idioma?: Idioma;
  /** Tom do texto: 'jogo' (RPG, padrão) ou 'normal' (direto, sem jargão de
      jogo) — independente do idioma escolhido. */
  tom_texto?: TomTexto;
  /** false = não consumir Frozen Streak automaticamente ao perder um dia de
      treino (o streak quebra normalmente). Padrão: true (ativado). */
  frozen_streak_auto_usar?: boolean;
  /** true = a seção Atividades do Início mostra o Bloco de Notas em vez da
      lista de atividades de bem-estar. Persistente — não volta sozinho
      pra Atividades. */
  atividades_modo_notas?: boolean;
  /** Itens do Bloco de Notas — lista de tarefas livre (não só atividades de
      bem-estar; qualquer coisa que o jogador queira anotar). */
  bloco_notas?: import('../bloco-notas.js').NotaItem[];
  /** Histórico de itens concluídos do Bloco de Notas (30 dias, separado da
      lista ativa — sobrevive a "Limpar tudo"/exclusão individual). */
  bloco_notas_historico?: import('../bloco-notas.js').NotaHistoricoItem[];
  /** Ordem das seções opcionais da Home. As seções fixas não entram nesta lista. */
  home_secoes_ordem?: import('../home-layout.js').HomeOptionalSectionId[];
  /** Seções opcionais ocultadas pelo usuário no modo de organização da Home. */
  home_secoes_ocultas?: import('../home-layout.js').HomeOptionalSectionId[];
  /** Alertas personalizados criados na página Atividades. */
  lembretes_personalizados?: import('../reminders.js').PersonalizedReminder[];
  /** Espelho transitório do perfil V2 enquanto a migration de coluna não foi aplicada. */
  ab_training_profile_v2?: AbTrainingProfileV2;
}

export type Idioma = 'pt' | 'en' | 'es';
export type TomTexto = 'jogo' | 'normal';

// —— Perfil de treino (onboarding "personal trainer") ————————————————————————

export type EscopoTreino = 'abdomen' | 'corpo_todo';

export type Foco = 'definicao' | 'forca' | 'resistencia' | 'hipertrofia' | 'saude';

export type ParteCorpo =
  'abdomen' | 'peito' | 'costas' | 'bracos' | 'ombros' | 'pernas' | 'gluteos';

export type RestricaoFisica = 'lombar' | 'joelhos' | 'punhos' | 'ombros' | 'pescoco';

export const ESCOPO_LABELS: Record<EscopoTreino, string> = {
  abdomen: 'Só abdômen',
  corpo_todo: 'Corpo todo',
};

export const FOCO_LABELS: Record<Foco, string> = {
  definicao: 'Definição',
  forca: 'Força',
  resistencia: 'Resistência',
  hipertrofia: 'Ganho muscular',
  saude: 'Saúde e condicionamento',
};

export const FOCO_HINTS: Record<Foco, string> = {
  definicao: 'Mais repetições, menos descanso — desenhar o músculo.',
  forca: 'Menos repetições, mais intensidade por série.',
  resistencia: 'Séries longas para aguentar mais tempo.',
  hipertrofia: 'Volume médio-alto para crescer o músculo.',
  saude: 'Ritmo equilibrado para se sentir bem no dia a dia.',
};

export const PARTE_CORPO_LABELS: Record<ParteCorpo, string> = {
  abdomen: 'Abdômen',
  peito: 'Peito',
  costas: 'Costas',
  bracos: 'Braços',
  ombros: 'Ombros',
  pernas: 'Pernas',
  gluteos: 'Glúteos',
};

export const PARTE_CORPO_ORDER: ParteCorpo[] = [
  'abdomen',
  'peito',
  'costas',
  'bracos',
  'ombros',
  'pernas',
  'gluteos',
];

export const RESTRICAO_LABELS: Record<RestricaoFisica, string> = {
  lombar: 'Lombar',
  joelhos: 'Joelhos',
  punhos: 'Punhos',
  ombros: 'Ombros',
  pescoco: 'Pescoço',
};

/** Respostas do questionário de treino — coluna própria `profiles.perfil_treino`. */
export interface PerfilTreino {
  escopo: EscopoTreino;
  foco: Foco;
  /** null = "recomendado": o sistema deriva as partes do foco. */
  partes: ParteCorpo[] | null;
  frequencia_semanal: number; // 2..7
  /** Dias fixos de treino (0=Dom..6=Sáb); null = sem dias fixos (legado). */
  dias_semana?: number[] | null;
  tempo_por_sessao_min: 10 | 20 | 30 | 45;
  restricoes: RestricaoFisica[];
  origem: 'onboarding' | 'reonboarding' | 'skip' | 'settings';
  atualizado_em: string;
}

export type AbTrainingIntensity = 'leve' | 'moderado' | 'evolyn';
export type AbTrainingVolume = 'curto' | 'equilibrado' | 'completo';

/** Perfil abdominal atual. O legado continua legível durante a transição. */
export interface AbTrainingProfileV2 {
  version: 2;
  intensity: AbTrainingIntensity;
  training_days: number[];
  volume: AbTrainingVolume;
  equipment: Partial<Record<EquipmentId, boolean>>;
  created_at: string;
  updated_at: string;
}

/** Esqueleto do plano gerado — coluna própria `profiles.plano_treino`. */
export interface PlanoTreino {
  versao: 1;
  gerado_em: string;
  semana_atual: number; // 1..4 (mesociclo)
  dias: PlanoDia[];
  dias_completados_rodada: number[];
}

export interface PlanoDia {
  indice: number;
  titulo: string;
  /** Preenchido no modo só-abdômen (A–E); null no corpo todo. */
  ciclo_id: TreinoBase | null;
  grupos: ParteCorpo[];
  /** Sub-zona abdominal do dia, quando o dia inclui abdômen. */
  enfase_abs: MusculoPrincipal | null;
}

/** IDs são abertos para preservar itens legados já salvos sem reativar o jogo removido. */
export type InventoryItemId = string;

export interface InventoryEntry {
  item_id: InventoryItemId;
  quantidade: number;
}

export interface Inventario {
  itens: InventoryEntry[];
}

export interface XpDiario {
  /** XP ganho hoje (exercícios, streak, conquistas, loja — teto unificado). */
  ganho_hoje: number;
  data_reset: string;
}

/** Acumuladores da semana corrente pro ranking semanal (reset lazy na virada). */
export interface WeekStats {
  /** Chave da semana (domingo âncora, YYYY-MM-DD em SP). */
  week_key: string;
  xp: number;
  moedas: number;
}

export interface Gamificacao {
  nivel_xp: number;
  streak_atual: number;
  streak_maior: number;
  /** Semana corrente do ranking semanal. */
  week_stats?: WeekStats;
  /** Semana anterior, preservada até o payout de domingo processar. */
  week_stats_prev?: WeekStats;
  /** Datas (YYYY-MM-DD, SP) em que um Frozen Streak manteve a ofensiva. */
  streak_congelamentos?: string[];
  /** Aviso único para exibir toast de proteção de streak no próximo acesso. */
  streak_freeze_notice_pending?: boolean;
  /** Quantas vezes o streak já quebrou de verdade (sem Frozen Streak) na vida
      da conta — libera "Recuperar Streak" ao chegar em STREAK_RECOVERY_UNLOCK_LOSSES. */
  streak_perdas_total?: number;
  /** Oferta ativa de "pagar pra recuperar o streak perdido" (ver shared/streak/recovery.ts) —
      só existe depois do desbloqueio; some ao ser resgatada ou quando o jogador
      reconstrói o streak sozinho até o mesmo tamanho. */
  streak_recovery_offer?: import('../streak/recovery.js').StreakRecoveryOffer | null;
  /** Recuperações compradas; impedem que /stats recrie a mesma oferta. */
  streak_recoveries?: import('../streak/recovery.js').StreakRecoveryReceipt[];
  streak_recovery_anchor?: import('../streak/recovery.js').StreakRecoveryAnchor | null;
  total_minutos: number;
  conquistas: string[];
  /** Mesmos ids de `conquistas`, na ordem em que foram desbloqueadas (mais
      recente por último) — usado pra mostrar "as 3 últimas" no preview do
      Início em vez de ordenar por raridade. */
  conquistas_ordem?: string[];
}

export type CosmeticKind = 'moldura_loja' | 'titulo' | 'som' | 'efeito' | 'banner';

export type CosmeticUnlockType =
  | 'gratis'
  | 'nivel'
  | 'conquista'
  | 'moedas'
  | 'codigo'
  /** Streak máxima (dias) atingida — ver streak_dias. */
  | 'streak'
  /** Possuir qualquer cosmético de raridade Mítica. */
  | 'item_mitico'
  /** Regra legada mantida para dados cosméticos já persistidos. */
  | 'conjunto_flamejante';

export type CosmeticRarity = 'comum' | 'raro' | 'epico' | 'lendario' | 'mitico' | 'secreto';

export type DailyRewardRarity = 'comum' | 'incomum' | 'raro' | 'epico';

export type DailyRewardType = 'xp' | 'abdoria' | 'pacote' | 'item';

export type DailyShopSlotKind = 'recompensa_diaria' | 'oferta';

export interface CosmeticUnlockRule {
  tipo: CosmeticUnlockType;
  nivel_min?: number;
  conquista_id?: string;
  preco_moedas?: number;
  /** Dias de streak (maior streak já atingida) exigidos pelo tipo 'streak'. */
  streak_dias?: number;
}

export interface CosmeticDefinition {
  id: string;
  kind: CosmeticKind;
  nome: string;
  descricao: string;
  icon: AchievementIcon;
  raridade: CosmeticRarity;
  unlock: CosmeticUnlockRule;
}

/** Molduras de avatar conquistadas por pódio semanal ou itens secretos. */
export type MolduraId = 'bronze' | 'prata' | 'ouro' | 'especial';

export const MOLDURA_LABELS: Record<MolduraId, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
  especial: 'Especial',
};

export interface Cosmeticos {
  /** Saldo de Dorias. */
  moedas: number;
  /**
   * Total vitalício de Coins ganhas (nunca desconta gasto) — base do ranking
   * global. Contas antigas inicializam no saldo atual (piso do vitalício real).
   */
  moedas_total_ganhas?: number;
  /** Blocos de XP já convertidos em Dorias. */
  moedas_xp_blocos: number;
  moldura_loja_equipada: string;
  titulo_equipado: string | null;
  som_equipado: string;
  efeito_equipado: string;
  banner_equipado: string;
  /** Moldura do avatar de identidade (null = sem moldura). */
  moldura_equipada?: MolduraId | null;
  /**
   * Qual borda o avatar de identidade mostra: 'podio' (usa `moldura_equipada`)
   * ou 'loja' (usa `moldura_loja_equipada`). Regra "última equipada vence" —
   * equipar uma borda de pódio seta 'podio', uma de conquista seta 'loja'.
   * Ausente = 'podio' (comportamento antigo).
   */
  borda_perfil_fonte?: 'podio' | 'loja';
  desbloqueados: string[];
  codigos_resgatados: string[];
  /** Desbloqueios automáticos ainda não celebrados na tela (fila do reveal). */
  desbloqueios_pendentes?: string[];
}

export interface LojaDiariaSlot {
  slot: number;
  kind: DailyShopSlotKind;
  recompensa_tipo: DailyRewardType;
  valor: number;
  raridade: DailyRewardRarity;
  preco_abdoria: number;
  /** Custo em XP (progresso do nível) para ofertas de Dorias ou pacotes mistos. */
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
  /** XP necessário para comprar 1 Doria na loja. */
  shop_xp_cost_per_abdoria: number;
  /** Dorias necessárias para comprar 1 XP na loja. */
  shop_abdoria_cost_per_xp: number;
  /** @deprecated Use shop_xp_cost_per_abdoria */
  xp_to_abdoria_rate: number;
  /** @deprecated Use shop_abdoria_cost_per_xp */
  abdoria_to_xp_rate: number;
  /** Dorias passivas a cada N XP totais. */
  abdoria_por_xp: number;
  moldura_loja_equipada: string;
  titulo_equipado: string | null;
  som_equipado: string;
  efeito_equipado: string;
  banner_equipado: string;
  molduras_loja: ShopCatalogItem[];
  titulos: ShopCatalogItem[];
  sons: ShopCatalogItem[];
  efeitos: ShopCatalogItem[];
  banners: ShopCatalogItem[];
}

export interface CosmeticsResponse extends ShopResponse {
  moedas: number;
  moedas_por_nivel: number;
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
  tipo: 'xp' | 'abdoria' | 'cosmetico' | 'frozen_streak' | 'gems';
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
  level_up?: LevelUpCelebration | null;
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

/** Bônus permanente de teto diário por conquista desbloqueada (+2 XP cada). */
export const XP_DAILY_CAP_PER_ACHIEVEMENT = 2;

export function dailyXpCapForUser(
  level: number,
  _legacyBestiaryUnlockedCount = 0,
  achievementUnlockedCount = 0,
): number {
  return dailyXpCapBreakdown(level, _legacyBestiaryUnlockedCount, achievementUnlockedCount).total;
}

export interface DailyXpCapBreakdown {
  base: number;
  bonus_nivel: number;
  bonus_bestiario: number;
  bonus_conquista: number;
  total: number;
}

/** Componentes permanentes do teto diário de XP. */
export function dailyXpCapBreakdown(
  level: number,
  _legacyBestiaryUnlockedCount = 0,
  achievementUnlockedCount = 0,
): DailyXpCapBreakdown {
  const safeLevel = Math.max(1, Math.floor(level));
  const safeAchievements = Math.max(0, Math.floor(achievementUnlockedCount));
  const base = XP_DAILY_CAP_BASE;
  const bonus_nivel = safeLevel * XP_DAILY_CAP_PER_LEVEL;
  const bonus_bestiario = 0;
  const bonus_conquista = safeAchievements * XP_DAILY_CAP_PER_ACHIEVEMENT;
  return {
    base,
    bonus_nivel,
    bonus_bestiario,
    bonus_conquista,
    total: base + bonus_nivel + bonus_bestiario + bonus_conquista,
  };
}

export function formatDailyXpCapBreakdown(breakdown: DailyXpCapBreakdown): string {
  const parts = [`${breakdown.base} base`, `+${breakdown.bonus_nivel} nível`];
  if (breakdown.bonus_conquista > 0) {
    parts.push(`+${breakdown.bonus_conquista} conquistas`);
  }
  return `${parts.join(' · ')} = ${breakdown.total} máx.`;
}

export function dailyFullExercisesForCap(cap: number): number {
  return Math.ceil(Math.max(0, cap) / XP_DAILY_PER_EXERCISE);
}

export const XP_STREAK_BONUS_PER_DAY = 1;
export const XP_STREAK_BONUS_MAX = 32;
export const XP_ACHIEVEMENT_BONUS = 1;
/** @deprecated Use XP_DAILY_PER_EXERCISE for daily exercise XP. */
export const XP_WORKOUT_BASE = 0;
/** @deprecated Use XP_DAILY_PER_EXERCISE for daily exercise XP. */
export const XP_PER_EXERCISE = XP_DAILY_PER_EXERCISE;
export const XP_PER_SKILL_UNLOCK = 1;
/** Loja: comprar 1 Doria custa N XP (progresso do nível). */
export const SHOP_XP_COST_PER_MOEDA = 25;
/** Loja: comprar 1 XP custa N Dorias. */
export const SHOP_MOEDA_COST_PER_XP = 5;
/** Dorias passivas: 1 moeda a cada N XP totais ganhos. */
export const MOEDA_XP_STEP = 10;
export const CURRENCY_NAME = 'Coins';

/** Custo em Dorias pra trocar de nome depois da primeira troca gratuita. */
export const NAME_CHANGE_COST = 10_000;

/** Tamanho máximo do nome de exibição (cadastro e troca de nome) — nomes já
    salvos antes dessa regra (2026-07-26) continuam valendo como estão, a
    restrição só passa a valer em novas escritas. */
export const NOME_MAX_LENGTH = 10;
export const NOME_MIN_LENGTH = 2;

export const FROZEN_STREAK_ITEM_ID: InventoryItemId = 'frozen_streak';
export const FROZEN_STREAK_LABEL = 'Frozen Streak';
export const FROZEN_STREAK_SHOP_PRICE = 25;

export function formatFrozenStreakDescription(): string {
  return 'Impede que sua ofensiva seja resetada caso você perca um dia de treino. Consumido automaticamente quando necessário.';
}

/** @deprecated Renomeado para {@link FROZEN_STREAK_ITEM_ID} */
export const ENERGY_DRINK_ITEM_ID = FROZEN_STREAK_ITEM_ID;
/** @deprecated */
export const ENERGY_DRINK_LABEL = FROZEN_STREAK_LABEL;
/** @deprecated */
export const ENERGY_DRINK_SHOP_PRICE = FROZEN_STREAK_SHOP_PRICE;
/** Moldura exclusiva de administradores — nunca listada pra não-admins
    (nem bloqueada); concedida/removida automaticamente conforme o papel. */
export const ADMIN_MOLDURA_ID = 'borda_admin';

/** Itens que nunca aparecem na Loja Evolyn nem no catálogo bloqueado. */
export const SHOP_HIDDEN_COSMETIC_IDS = ['titulo_dono_do_jogo', ADMIN_MOLDURA_ID] as const;

export function isShopHiddenCosmetic(id: string): boolean {
  return (SHOP_HIDDEN_COSMETIC_IDS as readonly string[]).includes(id);
}

export const INVENTORY_STACK_CAP = 99;
export const INVENTORY_STACK_CAPPED_ITEM_IDS: InventoryItemId[] = [FROZEN_STREAK_ITEM_ID];

export const DEFAULT_INVENTARIO: Inventario = { itens: [] };

export const DEFAULT_XP_DIARIO: XpDiario = {
  ganho_hoje: 0,
  data_reset: '',
};

/** @deprecated Use SHOP_XP_COST_PER_MOEDA */
export const XP_TO_MOEDA_RATE = SHOP_XP_COST_PER_MOEDA;
/** @deprecated Use SHOP_MOEDA_COST_PER_XP */
export const MOEDA_TO_XP_RATE = SHOP_MOEDA_COST_PER_XP;

/** @deprecated Use MOEDA_XP_STEP */
export const COINS_PER_LEVEL = MOEDA_XP_STEP;

export function moedaCostForXpReward(xpAmount: number): number {
  return Math.max(1, Math.ceil(xpAmount * SHOP_MOEDA_COST_PER_XP));
}

export function xpCostForMoedaReward(abdoriaAmount: number): number {
  return Math.max(1, Math.ceil(abdoriaAmount * SHOP_XP_COST_PER_MOEDA));
}

/** Estima Dorias restantes após gastar XP na loja (conversão passiva por blocos). */
export function projectedMoedaAfterXpSpend(
  nivelXp: number,
  moedas: number,
  moedasXpBlocos: number,
  xpCost: number,
): number {
  if (xpCost <= 0) return moedas;
  const nextTotal = Math.max(0, nivelXp - xpCost);
  const newBlocks = Math.floor(nextTotal / MOEDA_XP_STEP);
  const clawback = Math.max(0, moedasXpBlocos - newBlocks);
  return Math.max(0, moedas - clawback);
}

export const DEFAULT_COSMETICOS: Cosmeticos = {
  moedas: 0,
  moedas_xp_blocos: 0,
  moldura_loja_equipada: 'borda_basica',
  titulo_equipado: null,
  som_equipado: 'som_classico',
  efeito_equipado: 'efeito_padrao',
  banner_equipado: 'fundo_padrao',
  desbloqueados: ['borda_basica', 'som_classico', 'efeito_padrao', 'fundo_padrao'],
  codigos_resgatados: [],
};

export const COSMETIC_RARITY_LABELS: Record<CosmeticRarity, string> = {
  comum: 'Comum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
  mitico: 'Mítico',
  secreto: 'Secret',
};

export const COSMETIC_RARITY_ORDER: Record<CosmeticRarity, number> = {
  comum: 0,
  raro: 1,
  epico: 2,
  lendario: 3,
  mitico: 4,
  secreto: 5,
};

export function sortCosmeticCatalogItems<T extends { raridade: CosmeticRarity; nome: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const rarityDiff = COSMETIC_RARITY_ORDER[a.raridade] - COSMETIC_RARITY_ORDER[b.raridade];
    if (rarityDiff !== 0) return rarityDiff;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

export function groupCosmeticCatalogByRarity<T extends { raridade: CosmeticRarity; nome: string }>(
  items: T[],
): { raridade: CosmeticRarity; items: T[] }[] {
  const groups: { raridade: CosmeticRarity; items: T[] }[] = [];
  for (const item of sortCosmeticCatalogItems(items)) {
    const tail = groups[groups.length - 1];
    if (tail && tail.raridade === item.raridade) {
      tail.items.push(item);
    } else {
      groups.push({ raridade: item.raridade, items: [item] });
    }
  }
  return groups;
}

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
    merged.moedas_xp_blocos = Math.floor(nivelXp / MOEDA_XP_STEP);
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
  onboarding_completed: boolean;
  terms_accepted_at?: string | null;
  muscle_map_reset_at?: string | null;
  is_guest?: boolean;
  /** Foto de perfil; null/ausente = círculo com a inicial do nome. */
  avatar_url?: string | null;
  /** Tag única (#A7K2) — nomes de exibição podem repetir, a tag não. */
  tag?: string | null;
  /** Papel na moderação — 'user' por padrão; colunas novas podem estar ausentes. */
  role?: UserRole;
  /** Moeda premium (sem forma de ganhar in-game ainda, além de códigos). */
  gems?: number;
  /** Banimento/suspensão ativa (null/undefined = conta em dia). */
  banimento?: Banimento | null;
  /** Bio curta exibida no perfil (inclusive no público). */
  descricao?: string | null;
  /** Trocas de nome já feitas (1ª grátis, seguintes pagas). */
  nome_trocas?: number;
  /** Questionário de treino respondido; null/ausente = usuário legado. */
  perfil_treino?: PerfilTreino | null;
  /** Plano gerado a partir do perfil; null/ausente = pipeline de presets. */
  plano_treino?: PlanoTreino | null;
  ab_training_profile_v2?: AbTrainingProfileV2 | null;
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
  /** Dia do plano corpo-todo que este treino concluiu (modo plano). */
  plano_dia_indice?: number;
  /** Preenchido só em sessões de Atividade — métricas contextuais + OBS. */
  atividade?: import('../atividades.js').AtividadeLog | null;
  completion_id?: string | null;
}

export interface IWorkoutHistoryDocument extends IWorkoutHistory {
  id: string;
}

export interface Achievement extends AchievementDefinition {
  desbloqueada: boolean;
  /** Percentual real de jogadores (elegíveis) que têm essa conquista — computado no servidor. */
  pct_jogadores: number;
  /** Posição na ordem de desbloqueio do jogador (maior = mais recente);
      ausente pra quem ainda não tem essa conquista ou desbloqueou antes de
      esse rastreio existir. Usado pra mostrar "as últimas 3" no preview. */
  desbloqueada_ordem?: number;
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
  /** null quando o treino vem do plano corpo-todo (não há ciclo A–G). */
  ciclo_id: TreinoBase | null;
  nome: string;
  descricao: string;
  total_exercicios: number;
  exercicios: TreinoSugeridoExercicio[];
  primeiro_exercicio: string | null;
  /** Presentes só no modo plano (corpo todo). */
  plano_dia_indice?: number;
  plano_total_dias?: number;
  plano_titulo?: string;
}

export interface RepSchemeRecommendation {
  id: string;
  label: string;
  series: number;
  repeticoes: number;
  /** Segundos aplicados aos exercícios de tempo (prancha, isometrias). */
  tempo_seg?: number;
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
  /** Já existe alguma entrada de hoje (treino OU Atividade), ou seja: a
      sequência do dia está paga. Separado de `treino_hoje`, que só olha
      treino de verdade e por isso não serve pra decidir avisos de streak. */
  sequencia_garantida_hoje?: boolean;
  proximo_treino: string;
  treino_sugerido: TreinoSugerido | null;
  alertas_recomendacao?: RecommendationAlert[];
  total_segundos: number;
  total_minutos: number;
  streak_atual: number;
  streak_maior: number;
  nivel_xp: number;
  xp_hoje: number;
  xp_diario_limite: number;
  xp_diario_cap_base: number;
  xp_diario_cap_bonus_nivel: number;
  xp_diario_cap_bonus_bestiario: number;
  xp_diario_cap_bonus_conquista: number;
  xp_data_reset: string;
  inventario: Inventario;
  frozen_streak_count: number;
  /** Toast único: Frozen Streak salvou a ofensiva no último sync. */
  streak_frozen_notice?: boolean;
  /** Oferta ativa de "pagar pra recuperar o streak perdido" (ver shared/streak/recovery.ts). */
  streak_recovery_offer?: import('../streak/recovery.js').StreakRecoveryOffer | null;
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

export interface UnlockedAchievementNotice {
  id: string;
  titulo: string;
  descricao: string;
  icon: AchievementIcon;
}

export interface PersonalRecordNotice {
  slug: string;
  nome: string;
  modo: ModoExercicio;
  valor_anterior: number;
  valor_novo: number;
  unidade: 'reps' | 'segundos';
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
  new_achievements?: UnlockedAchievementNotice[];
  new_personal_records?: PersonalRecordNotice[];
}

export interface CompleteWorkoutPayload {
  treino_nome: string;
  treino_tipo?: TreinoTipo;
  exercicios: WorkoutExerciseEntry[];
  duracao_total_segundos: number;
  /** Dia do plano corpo-todo que este treino conclui (modo plano). */
  plano_dia_indice?: number;
  /** Chave idempotente da sessão restaurável. */
  completion_id?: string;
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
  laterality?: ExerciseLaterality;
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
  treino_personalizado_nome: string;
  treinos_salvos: SavedWorkoutPreset[];
  esquemas_reps: Partial<Record<NivelUsuario, StoredRepScheme[]>>;
  esquema_reps_selecionado: Partial<Record<NivelUsuario, string>>;
  exercicios_desbloqueados: string[];
}

export const DEFAULT_USER_DADOS_SALVOS: UserDadosSalvos = {
  treino_personalizado: [],
  treino_personalizado_nome: '',
  treinos_salvos: [],
  esquemas_reps: {},
  esquema_reps_selecionado: {},
  exercicios_desbloqueados: [],
};

export function resolveUserDadosSalvos(dados?: Partial<UserDadosSalvos> | null): UserDadosSalvos {
  const esquemas = dados?.esquemas_reps;
  return {
    treino_personalizado: dados?.treino_personalizado ?? [],
    treino_personalizado_nome: dados?.treino_personalizado_nome ?? '',
    treinos_salvos: dados?.treinos_salvos ?? [],
    esquemas_reps: esquemas ? { ...esquemas } : {},
    esquema_reps_selecionado: dados?.esquema_reps_selecionado
      ? { ...dados.esquema_reps_selecionado }
      : {},
    exercicios_desbloqueados: dados?.exercicios_desbloqueados ?? [],
  };
}

export function mergeUserDadosSalvos(
  current: UserDadosSalvos,
  patch: Partial<UserDadosSalvos>,
): UserDadosSalvos {
  return {
    treino_personalizado: patch.treino_personalizado ?? current.treino_personalizado,
    treino_personalizado_nome: patch.treino_personalizado_nome ?? current.treino_personalizado_nome,
    treinos_salvos: patch.treinos_salvos ?? current.treinos_salvos,
    esquemas_reps: patch.esquemas_reps
      ? { ...current.esquemas_reps, ...patch.esquemas_reps }
      : current.esquemas_reps,
    esquema_reps_selecionado: patch.esquema_reps_selecionado
      ? { ...current.esquema_reps_selecionado, ...patch.esquema_reps_selecionado }
      : current.esquema_reps_selecionado,
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
  /** Ciclo efetivamente escolhido (A–G) quando diferente de custom. */
  ciclo_selecionado?: TreinoBase;
  queue: WorkoutQueueItem[];
  config: ActiveWorkoutConfig;
  preset_id?: string;
  /** Dia do plano corpo-todo (modo plano) — repassado ao concluir. */
  plano_dia_indice?: number;
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
  /** Acumulado da semana corrente (rankings semanais de XP/Dorias); null no de streak. */
  week_value?: number | null;
  /** Foto de perfil; null = círculo com a inicial do nome. */
  avatar_url?: string | null;
  moldura_loja_equipada: string;
  moldura_equipada?: MolduraId | null;
  /** Qual borda o avatar de identidade mostra (ver `Cosmeticos.borda_perfil_fonte`). */
  borda_perfil_fonte?: 'podio' | 'loja';
  /** Contador sobreposto à moldura (pódios naquela posição). */
  moldura_count?: number | null;
  /** Fundo de perfil equipado (ex.: 'fundo_padrao') — estiliza a própria linha/pódio no ranking. */
  banner_equipado: string;
  is_me?: boolean;
  /** Total de participantes elegíveis no ranking — só vem em GET /leaderboard/me. */
  total?: number | null;
}

export type LeaderboardMetric = 'xp' | 'streak' | 'moedas';

/** Semanal = acumuladores que resetam no domingo; Global = totais vitalícios. */
export type LeaderboardPeriod = 'semanal' | 'global';

export const LEADERBOARD_DISPLAY_LIMIT = 25;

/** Recorde exibido no perfil público (top 3 por volume). */
export interface PublicProfileRecord {
  slug: string;
  nome: string;
  melhor_valor: number;
  unidade: 'reps' | 'segundos';
}

/** Conquista em destaque no perfil público. */
export interface PublicProfileConquista {
  id: string;
  titulo: string;
  icon: AchievementIcon;
  dificuldade: AchievementDifficulty;
}

/** Perfil público de outro usuário — whitelist positiva, nunca dados sensíveis. */
export interface PublicProfile {
  user_id: string;
  nome: string;
  avatar_url: string | null;
  descricao: string | null;
  level: number;
  streak_atual: number;
  moldura_loja_equipada: string;
  moldura_equipada: MolduraId | null;
  /** Qual borda o avatar de identidade mostra (ver `Cosmeticos.borda_perfil_fonte`). */
  borda_perfil_fonte?: 'podio' | 'loja';
  titulo_equipado: string | null;
  banner_equipado: string;
  podio: { first: number; second: number; third: number };
  tempo_jogo_minutos: number;
  records_top: PublicProfileRecord[];
  conquistas: {
    desbloqueadas: number;
    total: number;
    destaque: PublicProfileConquista[];
  };
  social: { followers: number; following: number; amigos: number };
  /** Curtidas de perfil (coração): total recebido + se o usuário logado já curtiu. */
  likes: { total: number; eu_curti: boolean };
  /** Visitantes únicos do perfil (cada usuário conta 1 vez, não por visita). */
  visualizacoes: number;
  /** Relação do usuário logado com este perfil. */
  relacao: { seguindo: boolean; segue_voce: boolean; amigo: boolean };
}

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
  /** Respostas do questionário de treino — o server gera o plano a partir dele. */
  perfil_treino?: Omit<PerfilTreino, 'atualizado_em'> & { atualizado_em?: string };
}

/** Rótulos das zonas abdominais (não confundir com peito/costas de musculação). */
export const MUSCULO_LABELS: Record<MusculoPrincipal, string> = {
  superior: 'Abdômen superior',
  inferior: 'Abdômen inferior',
  obliquos: 'Oblíquos (laterais)',
  core: 'Estabilidade profunda',
  completo: 'Corpo inteiro',
};

/** Rótulos curtos para tags em listas e filas — legíveis, sem siglas obscuras. */
export const MUSCULO_TAG_LABELS: Record<MusculoPrincipal, string> = {
  superior: 'Abd. superior',
  inferior: 'Abd. inferior',
  obliquos: 'Oblíquos',
  core: 'Estabilidade',
  completo: 'Corpo inteiro',
};

export const MUSCULO_HINTS: Record<MusculoPrincipal, string> = {
  superior: 'Parte alta do reto abdominal — crunch, sit-up. Não é peito.',
  inferior: 'Parte baixa do abdômen — elevações de pernas e reverse crunch.',
  obliquos: 'Laterais do tronco — rotações, bicicleta e prancha lateral.',
  core: 'Prancha, dead bug e antebraço — estabilização profunda do tronco.',
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

/** Prêmios do fechamento semanal dos rankings de XP e Dorias (pago em Dorias). */
export function weeklyLeaderboardReward(rank: number): number | null {
  if (rank < 1) return null;
  if (rank === 1) return 1000;
  if (rank === 2) return 700;
  if (rank === 3) return 300;
  return 100;
}

export const REP_SCHEME_BY_NIVEL: Record<NivelUsuario, RepSchemeRecommendation[]> = {
  iniciante: [
    {
      id: 'vol-12x3',
      label: '12 × 3',
      series: 3,
      repeticoes: 12,
      tempo_seg: 20,
      descricao: 'Volume clássico — ideal para começar',
    },
    {
      id: 'vol-10x3',
      label: '10 × 3',
      series: 3,
      repeticoes: 10,
      tempo_seg: 15,
      descricao: 'Controle e forma antes da carga',
    },
    {
      id: 'end-15x3',
      label: '15 × 3',
      series: 3,
      repeticoes: 15,
      tempo_seg: 25,
      descricao: 'Resistência com volume equilibrado',
    },
  ],
  intermediario: [
    {
      id: 'vol-14x3',
      label: '14 × 3',
      series: 3,
      repeticoes: 14,
      tempo_seg: 30,
      descricao: 'Volume moderado-alto',
    },
    {
      id: 'vol-12x4',
      label: '12 × 4',
      series: 4,
      repeticoes: 12,
      tempo_seg: 30,
      descricao: 'Mais séries, mesmo volume por série',
    },
    {
      id: 'end-16x3',
      label: '16 × 3',
      series: 3,
      repeticoes: 16,
      tempo_seg: 35,
      descricao: 'Foco em resistência muscular',
    },
  ],
  avancado: [
    {
      id: 'for-8x4',
      label: '8 × 4',
      series: 4,
      repeticoes: 8,
      tempo_seg: 40,
      descricao: 'Força e densidade',
    },
    {
      id: 'for-10x5',
      label: '10 × 5',
      series: 5,
      repeticoes: 10,
      tempo_seg: 45,
      descricao: 'Alto volume total por exercício',
    },
    {
      id: 'vol-12x3',
      label: '12 × 3',
      series: 3,
      repeticoes: 12,
      tempo_seg: 40,
      descricao: 'Manutenção técnica com volume',
    },
  ],
};

export const DEFAULT_PREFERENCIAS: UserPreferencias = {
  descanso_padrao_seg: 30,
  som_habilitado: true,
  sfx_volume: 0.7,
  confetti_animacoes_habilitadas: true,
  frozen_streak_auto_usar: true,
  idioma: 'pt',
  tom_texto: 'normal',
  ciclo_treinos: ['A', 'B', 'C'],
  modo_padrao: 'tempo',
  reps_series_padrao: 3,
  reps_repeticoes_padrao: 12,
  preset_favorito_id: null,
  tutorial_visto: false,
  ocultar_aviso_xp_diario: false,
  exercicios_fixos: [],
  exercicios_nao_recomendar: [],
  treinos_fixos: [],
  treinos_nao_recomendar: [],
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
    {
      id: 'atleta',
      label: 'Atleta',
      descricao: 'Abdômen muito definido, vascularização visível.',
      min: 6,
      max: 10,
    },
    {
      id: 'definido',
      label: 'Definido',
      descricao: 'Six-pack visível com boa iluminação.',
      min: 10,
      max: 14,
    },
    {
      id: 'atletico',
      label: 'Atlético',
      descricao: 'Contorno abdominal perceptível.',
      min: 14,
      max: 18,
    },
    {
      id: 'medio',
      label: 'Médio',
      descricao: 'Pouca definição; foco em consistência.',
      min: 18,
      max: 25,
    },
    {
      id: 'acima',
      label: 'Acima',
      descricao: 'Priorize hábito, sono e déficit calórico leve.',
      min: 25,
      max: 60,
    },
  ],
  feminino: [
    {
      id: 'atleta',
      label: 'Atleta',
      descricao: 'Definição alta com pouca gordura essencial.',
      min: 14,
      max: 18,
    },
    { id: 'definido', label: 'Definido', descricao: 'Linha do abdômen visível.', min: 18, max: 22 },
    {
      id: 'atletico',
      label: 'Atlético',
      descricao: 'Formato tonificado, definição parcial.',
      min: 22,
      max: 28,
    },
    {
      id: 'medio',
      label: 'Médio',
      descricao: 'Zona comum; treino + alimentação aceleram.',
      min: 28,
      max: 35,
    },
    {
      id: 'acima',
      label: 'Acima',
      descricao: 'Comece com volume moderado e constância.',
      min: 35,
      max: 60,
    },
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
export function estimarGorduraCorporal(imc: number, idade: number, sexo: SexoBiologico): number {
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

export function calcProgressoDefinicao(atual: number, meta: number, inicio?: number): number {
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
    base.unshift(
      `Faltam ~${diffPct.toFixed(1)} p.p. de gordura para a meta — consistência vale mais que intensidade extrema.`,
    );
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
  const modo: ModoExercicio =
    exercise.modo === 'ambos' ? (isIso ? 'tempo' : 'reps') : exercise.modo;

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
export type { EquipmentId } from '../equipment/index.js';
export {
  ALWAYS_AVAILABLE_PUSH_UP_SLUGS,
  EQUIPMENT_CATALOG,
  EQUIPMENT_IDS,
  getAllEquipmentExerciseSlugs,
  getEnabledEquipmentIds,
  getExerciseSlugsForEquipment,
  isExerciseAvailableForUser,
  resolveUserEquipment,
  slugsUnlockedByEquipment,
} from '../equipment/index.js';
export {
  xpFloorForCurrentLevel,
  spendableXpForShop,
  xpLevelFromTotal,
  xpProgressFromTotal,
  xpRequiredForNextLevel,
  type XpLevelProgress,
} from './xp-level.js';
