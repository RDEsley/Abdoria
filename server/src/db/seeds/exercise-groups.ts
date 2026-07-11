import type { ParteCorpo, RestricaoFisica } from '../../types/index.js';

/**
 * Curadoria de partes do corpo por exercício (primeira = principal).
 * Slug ausente = ['abdomen'] — o catálogo original é abdominal por padrão.
 */
export const EXERCISE_GRUPOS: Record<string, ParteCorpo[]> = {
  // Dinâmicos de corpo inteiro — abs como base, pernas/peito como suporte.
  'mountain-climbers': ['abdomen', 'pernas'],
  burpee: ['abdomen', 'pernas', 'peito'],
  'plank-jacks': ['abdomen', 'pernas'],
  'bear-crawl': ['abdomen', 'ombros', 'pernas'],

  // Flexões — peito/braços com core estabilizador.
  'push-up': ['peito', 'bracos'],
  'incline-push-up': ['peito', 'bracos'],
  'decline-push-up': ['peito', 'ombros', 'bracos'],

  // Prancha 9 em 1.
  'push-up-board-chest': ['peito', 'bracos'],
  'push-up-board-chest-wide': ['peito', 'bracos'],
  'push-up-board-decline': ['peito', 'ombros', 'bracos'],
  'push-up-board-triceps': ['bracos', 'peito'],
  'push-up-board-triceps-diamond': ['bracos', 'peito'],
  'push-up-board-shoulders': ['ombros', 'bracos'],
  'push-up-board-shoulders-pike': ['ombros', 'bracos'],
  'push-up-board-back': ['costas'],
  'push-up-board-back-wide': ['costas'],

  // Barra fixa.
  'pull-up': ['costas', 'bracos'],
  'chin-up': ['costas', 'bracos'],
  'dead-hang': ['costas', 'ombros'],
};

/**
 * Regiões sensíveis que tiram o exercício das recomendações quando o usuário
 * declara a restrição no onboarding. Curadoria conservadora — só cargas óbvias.
 */
export const EXERCISE_CONTRAINDICACOES: Record<string, RestricaoFisica[]> = {
  crunch: ['pescoco'],
  'bicycle-crunch': ['pescoco'],
  'toe-touches': ['pescoco'],
  'sit-up': ['lombar', 'pescoco'],
  'stability-ball-crunch': ['pescoco'],
  'jackknife-sit-up': ['lombar'],
  'leg-raises': ['lombar'],
  'flutter-kicks': ['lombar'],
  'scissor-kicks': ['lombar'],
  'v-hold': ['lombar'],
  'hollow-hold': ['lombar'],
  'windshield-wipers': ['lombar'],
  'russian-twist': ['lombar'],
  'dragon-flag': ['lombar', 'pescoco'],
  'ab-wheel': ['lombar', 'punhos'],
  'ab-wheel-knees': ['lombar', 'punhos'],
  'ab-wheel-standing': ['lombar', 'punhos'],
  'mountain-climbers': ['punhos'],
  'bear-crawl': ['punhos'],
  'spiderman-plank': ['punhos'],
  'l-sit': ['punhos'],
  burpee: ['punhos', 'joelhos'],
  'copenhagen-plank': ['joelhos'],
  'push-up': ['punhos'],
  'incline-push-up': ['punhos'],
  'decline-push-up': ['punhos', 'ombros'],
  'push-up-board-shoulders': ['ombros'],
  'push-up-board-shoulders-pike': ['ombros'],
  'pull-up': ['ombros'],
  'chin-up': ['ombros'],
  'dead-hang': ['ombros'],
  'hanging-knee-raise': ['ombros'],
};
