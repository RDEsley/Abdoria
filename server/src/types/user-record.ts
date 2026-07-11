import type {
  AfkPendingReward,
  AfkState,
  Cosmeticos,
  Gamificacao,
  Inventario,
  LojaDiaria,
  NivelUsuario,
  Objetivo,
  SimulacaoDefinicao,
  UserDadosSalvos,
  UserPreferencias,
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
  /** Quantas trocas de nome o usuário já fez (1ª grátis, depois pagas). */
  nome_trocas?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type UserLean = UserRecord;
