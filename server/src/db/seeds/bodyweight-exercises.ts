import { withCustomParams, withLevelParams } from '../../utils/exercise-params.js';
import type { IExercise } from '../../types/index.js';

/**
 * Exercícios de calistenia sem equipamento — base do modo corpo todo.
 * musculo_principal usa a taxonomia abdominal legada ('completo' quando o
 * exercício não é de abdômen); a parte do corpo real mora em `grupos`.
 */
export const bodyweightExercises: IExercise[] = [
  // —— Pernas e glúteos ——
  withLevelParams({
    slug: 'bodyweight-squat',
    nome: 'Bodyweight Squat',
    nivel: 1,
    musculo_principal: 'completo',
    tempo_recomendado: 30,
    prioridade: 'A',
    descricao:
      'Agachamento com o peso do corpo: pés na largura dos ombros, desça até as coxas ficarem paralelas ao chão mantendo o peito aberto.',
    media: { gif: 'bodyweight-squat.gif' },
    ativo: true,
    grupos: ['pernas', 'gluteos'],
  }),
  withLevelParams({
    slug: 'sumo-squat',
    nome: 'Sumo Squat',
    nivel: 1,
    musculo_principal: 'completo',
    tempo_recomendado: 30,
    prioridade: 'B',
    descricao:
      'Agachamento com pés bem afastados e pontas para fora — maior ênfase em adutores e glúteos.',
    media: { gif: 'sumo-squat.gif' },
    ativo: true,
    grupos: ['pernas', 'gluteos'],
  }),
  withCustomParams(
    {
      slug: 'lunge',
      nome: 'Lunge',
      nivel: 2,
      musculo_principal: 'completo',
      tempo_recomendado: 30,
      prioridade: 'A',
      descricao:
        'Passo à frente flexionando os dois joelhos a 90° — alterne as pernas a cada repetição.',
      media: { gif: 'lunge.gif' },
      ativo: true,
      grupos: ['pernas', 'gluteos'],
      contraindicacoes: ['joelhos'],
    },
    { repeticoes_iniciante: 8, repeticoes_intermediario: 12, repeticoes_avancado: 16 },
  ),
  withCustomParams(
    {
      slug: 'reverse-lunge',
      nome: 'Reverse Lunge',
      nivel: 2,
      musculo_principal: 'completo',
      tempo_recomendado: 30,
      prioridade: 'B',
      descricao:
        'Passo para trás flexionando os joelhos — mais estável e com menos pressão no joelho da frente que o afundo clássico.',
      media: { gif: 'reverse-lunge.gif' },
      ativo: true,
      grupos: ['pernas', 'gluteos'],
      contraindicacoes: ['joelhos'],
    },
    { repeticoes_iniciante: 8, repeticoes_intermediario: 12, repeticoes_avancado: 16 },
  ),
  withLevelParams({
    slug: 'glute-bridge',
    nome: 'Glute Bridge',
    nivel: 1,
    musculo_principal: 'completo',
    musculos_secundarios: ['core'],
    tempo_recomendado: 30,
    prioridade: 'A',
    descricao:
      'Deitado, pés no chão, eleve o quadril contraindo os glúteos até alinhar tronco e coxas.',
    media: { gif: 'glute-bridge.gif' },
    ativo: true,
    grupos: ['gluteos', 'pernas'],
  }),
  withCustomParams(
    {
      slug: 'single-leg-glute-bridge',
      nome: 'Single-Leg Glute Bridge',
      nivel: 3,
      musculo_principal: 'completo',
      musculos_secundarios: ['core'],
      tempo_recomendado: 30,
      prioridade: 'B',
      descricao:
        'Ponte de glúteos com uma perna estendida — dobro de carga no glúteo de apoio, quadril sempre nivelado.',
      media: { gif: 'single-leg-glute-bridge.gif' },
      ativo: true,
      grupos: ['gluteos', 'pernas'],
    },
    { repeticoes_iniciante: 6, repeticoes_intermediario: 10, repeticoes_avancado: 14 },
  ),
  withCustomParams(
    {
      slug: 'calf-raise',
      nome: 'Calf Raise',
      nivel: 1,
      musculo_principal: 'completo',
      tempo_recomendado: 30,
      prioridade: 'C',
      descricao:
        'Em pé, eleve os calcanhares o máximo possível e desça controlado — panturrilhas.',
      media: { gif: 'calf-raise.gif' },
      ativo: true,
      grupos: ['pernas'],
    },
    { repeticoes_iniciante: 15, repeticoes_intermediario: 20, repeticoes_avancado: 25 },
  ),
  withCustomParams(
    {
      slug: 'wall-sit',
      nome: 'Wall Sit',
      nivel: 2,
      musculo_principal: 'completo',
      tempo_recomendado: 45,
      prioridade: 'isometrico',
      descricao:
        'Costas na parede, joelhos a 90°, como se estivesse sentado numa cadeira invisível — segure o tempo indicado.',
      media: { gif: 'wall-sit.gif' },
      ativo: true,
      grupos: ['pernas'],
      contraindicacoes: ['joelhos'],
    },
    { tempo_seg_iniciante: 30, tempo_seg_intermediario: 45, tempo_seg_avancado: 60 },
  ),
  withCustomParams(
    {
      slug: 'squat-jump',
      nome: 'Squat Jump',
      nivel: 3,
      musculo_principal: 'completo',
      tempo_recomendado: 30,
      prioridade: 'dinamico',
      modo: 'reps',
      descricao:
        'Agachamento explosivo com salto vertical — aterrisse macio, absorvendo o impacto com as pernas.',
      media: { gif: 'squat-jump.gif' },
      ativo: true,
      grupos: ['pernas', 'gluteos'],
      contraindicacoes: ['joelhos'],
    },
    { repeticoes_iniciante: 8, repeticoes_intermediario: 12, repeticoes_avancado: 15 },
  ),

  // —— Braços, ombros e peito ——
  withCustomParams(
    {
      slug: 'chair-dips',
      nome: 'Chair Dips',
      nivel: 2,
      musculo_principal: 'completo',
      musculos_secundarios: ['core'],
      tempo_recomendado: 30,
      prioridade: 'A',
      descricao:
        'Mãos na beirada de uma cadeira firme, desça flexionando os cotovelos para trás — tríceps e peito.',
      media: { gif: 'chair-dips.gif' },
      ativo: true,
      grupos: ['bracos', 'peito'],
      contraindicacoes: ['ombros', 'punhos'],
    },
    { repeticoes_iniciante: 6, repeticoes_intermediario: 10, repeticoes_avancado: 14 },
  ),
  withCustomParams(
    {
      slug: 'pike-push-up',
      nome: 'Pike Push-Up',
      nivel: 3,
      musculo_principal: 'completo',
      musculos_secundarios: ['core'],
      tempo_recomendado: 30,
      prioridade: 'B',
      descricao:
        'Flexão em "V" invertido com o quadril alto — desça a cabeça entre as mãos, foco nos deltoides.',
      media: { gif: 'pike-push-up.gif' },
      ativo: true,
      grupos: ['ombros', 'bracos'],
      contraindicacoes: ['ombros', 'punhos'],
    },
    { repeticoes_iniciante: 5, repeticoes_intermediario: 8, repeticoes_avancado: 11 },
  ),

  // —— Costas e postura ——
  withCustomParams(
    {
      slug: 'superman',
      nome: 'Superman',
      nivel: 1,
      musculo_principal: 'completo',
      musculos_secundarios: ['core'],
      tempo_recomendado: 30,
      prioridade: 'A',
      descricao:
        'De bruços, eleve braços e pernas ao mesmo tempo contraindo lombar e glúteos — segure 1s no topo.',
      media: { gif: 'superman.gif' },
      ativo: true,
      grupos: ['costas', 'gluteos'],
      contraindicacoes: ['lombar'],
    },
    { repeticoes_iniciante: 10, repeticoes_intermediario: 14, repeticoes_avancado: 18 },
  ),
  withCustomParams(
    {
      slug: 'bird-dog',
      nome: 'Bird Dog',
      nivel: 1,
      musculo_principal: 'core',
      tempo_recomendado: 30,
      prioridade: 'B',
      descricao:
        'Em quatro apoios, estenda braço e perna opostos mantendo o tronco estável — costas e core profundo.',
      media: { gif: 'bird-dog.gif' },
      ativo: true,
      grupos: ['costas', 'abdomen'],
    },
    { repeticoes_iniciante: 8, repeticoes_intermediario: 12, repeticoes_avancado: 16 },
  ),
];
