/** Nomes em português por slug — fonte única para exibição na interface. */
export const EXERCISE_NOME_PT: Record<string, string> = {
  crunch: 'Abdominal',
  'reverse-crunch': 'Abdominal invertido',
  'bicycle-crunch': 'Abdominal bicicleta',
  'mountain-climbers': 'Escalador',
  'leg-raises': 'Elevação de pernas',
  plank: 'Prancha',
  'heel-touches': 'Toque nos calcanhares',
  'dead-bug': 'Inseto morto',
  'hollow-hold': 'Posição oca',
  'scissor-kicks': 'Tesoura abdominal',
  'jackknife-sit-up': 'Abdominal canivete',
  'windshield-wipers': 'Limpador de para-brisa',
  burpee: 'Burpee',
  'plank-jacks': 'Prancha com polichinelo',
  'v-hold': 'Posição em V',
  'russian-twist': 'Rotação russa',
  'flutter-kicks': 'Chutes alternados',
  'toe-touches': 'Toque nos pés',
  'sit-up': 'Abdominal completo',
  'side-plank': 'Prancha lateral',
  'bear-crawl': 'Caminhada do urso',
  'spiderman-plank': 'Prancha Homem-Aranha',
  'hanging-knee-raise': 'Elevação de joelhos na barra',
  'stability-ball-crunch': 'Abdominal na bola',
  'thread-the-needle': 'Passar a agulha',
  'dragon-flag': 'Bandeira do dragão',
  'l-sit': 'Posição em L',
  'ab-wheel': 'Rolinho abdominal',
  'ab-wheel-knees': 'Rolinho — joelhos',
  'ab-wheel-standing': 'Rolinho — em pé',
  'push-up-board-chest': 'Flexão prancha — peito (vermelho)',
  'push-up-board-chest-wide': 'Flexão prancha — peito largo (vermelho)',
  'push-up-board-decline': 'Flexão prancha — peito declinado (vermelho)',
  'push-up-board-triceps': 'Flexão prancha — tríceps (verde)',
  'push-up-board-triceps-diamond': 'Flexão prancha — tríceps diamante (verde)',
  'push-up-board-shoulders': 'Flexão prancha — ombros (azul)',
  'push-up-board-shoulders-pike': 'Flexão prancha — ombros pike (azul)',
  'push-up-board-back': 'Flexão prancha — costas (amarelo)',
  'push-up-board-back-wide': 'Flexão prancha — costas aberto (amarelo)',
  'pull-up': 'Barra fixa — pronada',
  'chin-up': 'Barra fixa — supinada',
  'dead-hang': 'Suspensão isométrica',
  'copenhagen-plank': 'Prancha de Copenhagen',
  'push-up': 'Flexão',
  'incline-push-up': 'Flexão inclinada',
  'decline-push-up': 'Flexão declinada',
};

export function resolveExerciseNomePt(exercise: { slug?: string; nome_pt?: string }): string | undefined {
  if (exercise.nome_pt?.trim()) return exercise.nome_pt.trim();
  if (exercise.slug) return EXERCISE_NOME_PT[exercise.slug];
  return undefined;
}

/** Ex.: "Crunch (Abdominal)" */
export function formatExerciseName(exercise: {
  nome: string;
  slug?: string;
  nome_pt?: string;
}): string {
  const pt = resolveExerciseNomePt(exercise);
  if (!pt) return exercise.nome;

  const suffix = `(${pt})`;
  if (exercise.nome.includes(suffix)) return exercise.nome;

  return `${exercise.nome} (${pt})`;
}
