import type {
  AfkPendingReward,
  AfkState,
  Banimento,
  Cosmeticos,
  Gamificacao,
  Inventario,
  LojaDiaria,
  NivelUsuario,
  Objetivo,
  PerfilTreino,
  PlanoTreino,
  SimulacaoDefinicao,
  UserDadosSalvos,
  UserPreferencias,
  UserRole,
  XpDiario,
} from './index.js';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash?: string;
  nome: string;
  idade?: number;
  peso_kg?: number;
  altura_cm?: number;
  imc?: number;
  nivel: NivelUsuario;
  objetivo: Objetivo;
  gamificacao: Gamificacao;
  cosmeticos: Cosmeticos;
  loja_diaria: LojaDiaria;
  simulacao_definicao: SimulacaoDefinicao;
  preferencias: UserPreferencias;
  dados_salvos: UserDadosSalvos;
  xp_diario: XpDiario;
  inventario: Inventario;
  afk: AfkState & { pending: AfkPendingReward };
  onboarding_completed: boolean;
  terms_accepted_at?: Date | string | null;
  muscle_map_reset_at?: Date | string | null;
  is_guest: boolean;
  is_demo_npc: boolean;
  /** Foto de perfil (Supabase Storage). null = usa a inicial do nome. */
  avatar_url?: string | null;
  /** Tag única (#A7K2) — permite nomes repetidos sem conflito. */
  tag?: string | null;
  /** Bio curta do perfil (visível no perfil público). */
  descricao?: string | null;
  /** Quantas trocas de nome o usuário já fez (1ª grátis, depois pagas). */
  nome_trocas?: number;
  /** Papel na moderação (user/moderador/admin). undefined = coluna não migrada. */
  role?: UserRole | null;
  /** Moeda premium. undefined = coluna não migrada. */
  gems?: number | null;
  /** Banimento/suspensão ativa. undefined = coluna não migrada. */
  banimento?: Banimento | null;
  /** Questionário de treino (Grupo H). null = usuário legado. */
  perfil_treino?: PerfilTreino | null;
  /** Plano gerado a partir do perfil. null = pipeline de presets. */
  plano_treino?: PlanoTreino | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type UserLean = UserRecord;
