import type { NivelUsuario, Objetivo } from '../types/index.js';

export interface DemoUserSeed {
  email: string;
  nome: string;
  idade: number;
  nivel: NivelUsuario;
  objetivo: Objetivo;
  gamificacao: {
    nivel_xp: number;
    streak_atual: number;
    streak_maior: number;
    total_minutos: number;
    conquistas: string[];
  };
}

/** Jogadores fictícios para ranking e sensação de comunidade ativa (números alcançáveis). */
export const DEMO_USERS: DemoUserSeed[] = [
  {
    email: 'diego.npc@abdoria.local',
    nome: 'Diego Lima',
    idade: 27,
    nivel: 'intermediario',
    objetivo: 'definicao',
    gamificacao: {
      nivel_xp: 680,
      streak_atual: 11,
      streak_maior: 14,
      total_minutos: 94,
      conquistas: ['primeiro_treino', 'streak_2', 'streak_3', 'treinos_5'],
    },
  },
  {
    email: 'henrique.npc@abdoria.local',
    nome: 'Henrique Alves',
    idade: 31,
    nivel: 'intermediario',
    objetivo: 'forca',
    gamificacao: {
      nivel_xp: 590,
      streak_atual: 9,
      streak_maior: 12,
      total_minutos: 81,
      conquistas: ['primeiro_treino', 'streak_2', 'streak_3', 'treinos_5'],
    },
  },
  {
    email: 'marco.npc@abdoria.local',
    nome: 'Marco Antônio',
    idade: 24,
    nivel: 'intermediario',
    objetivo: 'resistencia',
    gamificacao: {
      nivel_xp: 520,
      streak_atual: 8,
      streak_maior: 10,
      total_minutos: 73,
      conquistas: ['primeiro_treino', 'streak_2', 'streak_3'],
    },
  },
  {
    email: 'bruno.npc@abdoria.local',
    nome: 'Bruno Costa',
    idade: 29,
    nivel: 'intermediario',
    objetivo: 'definicao',
    gamificacao: {
      nivel_xp: 450,
      streak_atual: 7,
      streak_maior: 9,
      total_minutos: 66,
      conquistas: ['primeiro_treino', 'streak_2', 'streak_3', 'treinos_5'],
    },
  },
  {
    email: 'joao.npc@abdoria.local',
    nome: 'João Pedro',
    idade: 22,
    nivel: 'iniciante',
    objetivo: 'definicao',
    gamificacao: {
      nivel_xp: 380,
      streak_atual: 6,
      streak_maior: 8,
      total_minutos: 57,
      conquistas: ['primeiro_treino', 'streak_2', 'streak_3'],
    },
  },
  {
    email: 'felipe.npc@abdoria.local',
    nome: 'Felipe Souza',
    idade: 26,
    nivel: 'iniciante',
    objetivo: 'manutencao',
    gamificacao: {
      nivel_xp: 320,
      streak_atual: 5,
      streak_maior: 7,
      total_minutos: 51,
      conquistas: ['primeiro_treino', 'streak_2', 'treinos_5'],
    },
  },
  {
    email: 'ana.npc@abdoria.local',
    nome: 'Ana Silva',
    idade: 28,
    nivel: 'iniciante',
    objetivo: 'definicao',
    gamificacao: {
      nivel_xp: 275,
      streak_atual: 5,
      streak_maior: 6,
      total_minutos: 47,
      conquistas: ['primeiro_treino', 'streak_2', 'streak_3'],
    },
  },
  {
    email: 'larissa.npc@abdoria.local',
    nome: 'Larissa Campos',
    idade: 23,
    nivel: 'iniciante',
    objetivo: 'resistencia',
    gamificacao: {
      nivel_xp: 210,
      streak_atual: 4,
      streak_maior: 5,
      total_minutos: 38,
      conquistas: ['primeiro_treino', 'streak_2'],
    },
  },
  {
    email: 'giulia.npc@abdoria.local',
    nome: 'Giulia Ferreira',
    idade: 21,
    nivel: 'iniciante',
    objetivo: 'definicao',
    gamificacao: {
      nivel_xp: 165,
      streak_atual: 3,
      streak_maior: 4,
      total_minutos: 31,
      conquistas: ['primeiro_treino', 'streak_2'],
    },
  },
  {
    email: 'carla.npc@abdoria.local',
    nome: 'Carla Mendes',
    idade: 34,
    nivel: 'iniciante',
    objetivo: 'manutencao',
    gamificacao: {
      nivel_xp: 130,
      streak_atual: 3,
      streak_maior: 3,
      total_minutos: 27,
      conquistas: ['primeiro_treino'],
    },
  },
  {
    email: 'isabela.npc@abdoria.local',
    nome: 'Isabela Nunes',
    idade: 19,
    nivel: 'iniciante',
    objetivo: 'definicao',
    gamificacao: {
      nivel_xp: 85,
      streak_atual: 2,
      streak_maior: 2,
      total_minutos: 18,
      conquistas: ['primeiro_treino'],
    },
  },
  {
    email: 'elena.npc@abdoria.local',
    nome: 'Elena Rocha',
    idade: 25,
    nivel: 'iniciante',
    objetivo: 'definicao',
    gamificacao: {
      nivel_xp: 45,
      streak_atual: 1,
      streak_maior: 1,
      total_minutos: 12,
      conquistas: ['primeiro_treino'],
    },
  },
];

export const DEMO_USER_EMAILS = DEMO_USERS.map((u) => u.email);
