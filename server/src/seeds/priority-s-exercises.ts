import type { Prioridade } from '../types/index.js';

export interface ExerciseSeedBase {
  slug: string;
  nome: string;
  nivel: 1 | 2 | 3 | 4;
  musculo_principal: 'superior' | 'inferior' | 'obliquos' | 'core' | 'completo';
  musculos_secundarios?: ('superior' | 'inferior' | 'obliquos' | 'core' | 'completo')[];
  tempo_recomendado: number;
  prioridade: Prioridade;
  descricao: string;
  media: { gif: string };
  ativo: boolean;
}

export const prioritySExercises: ExerciseSeedBase[] = [
  {
    slug: 'crunch',
    nome: 'Crunch',
    nivel: 1,
    musculo_principal: 'superior',
    tempo_recomendado: 30,
    prioridade: 'S',
    descricao: 'Flexão de tronco clássica focada no reto abdominal superior.',
    media: { gif: 'crunch.gif' },
    ativo: true,
  },
  {
    slug: 'reverse-crunch',
    nome: 'Reverse Crunch',
    nivel: 2,
    musculo_principal: 'inferior',
    tempo_recomendado: 30,
    prioridade: 'S',
    descricao: 'Elevação de quadril para ativar a porção inferior do abdômen.',
    media: { gif: 'reverse-crunch.gif' },
    ativo: true,
  },
  {
    slug: 'bicycle-crunch',
    nome: 'Bicycle Crunch',
    nivel: 2,
    musculo_principal: 'obliquos',
    musculos_secundarios: ['completo'],
    tempo_recomendado: 30,
    prioridade: 'S',
    descricao: 'Movimento alternado de cotovelo e joelho para oblíquos e core.',
    media: { gif: 'bicycle-crunch.gif' },
    ativo: true,
  },
  {
    slug: 'mountain-climbers',
    nome: 'Mountain Climbers',
    nivel: 3,
    musculo_principal: 'completo',
    tempo_recomendado: 30,
    prioridade: 'S',
    descricao: 'Cardio dinâmico que estimula todo o core com alta intensidade.',
    media: { gif: 'mountain-climbers.gif' },
    ativo: true,
  },
  {
    slug: 'leg-raises',
    nome: 'Leg Raises',
    nivel: 2,
    musculo_principal: 'inferior',
    tempo_recomendado: 30,
    prioridade: 'S',
    descricao: 'Elevação controlada das pernas para reforço do abdômen inferior.',
    media: { gif: 'leg-raises.gif' },
    ativo: true,
  },
  {
    slug: 'plank',
    nome: 'Plank',
    nivel: 1,
    musculo_principal: 'core',
    tempo_recomendado: 30,
    prioridade: 'S',
    descricao: 'Isometria fundamental para estabilidade e resistência do core.',
    media: { gif: 'plank.gif' },
    ativo: true,
  },
];
