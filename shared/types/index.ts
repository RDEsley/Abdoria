/**
 * Tipos de domínio compartilhados entre client e server.
 * Mantém contratos de API, exercícios, usuário e gamificação alinhados.
 */

export type NivelUsuario = 'iniciante' | 'intermediario' | 'avancado';

export type Objetivo = 'definicao' | 'resistencia' | 'forca' | 'manutencao';

export type MusculoPrincipal =
  | 'superior'
  | 'inferior'
  | 'obliquos'
  | 'core'
  | 'completo';

export type Prioridade = 'S' | 'A' | 'B' | 'C' | 'dinamico' | 'isometrico';

export type TreinoBase = 'A' | 'B' | 'C' | 'D' | 'E';

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
  preset_favorito_id?: string | null;
  tutorial_visto: boolean;
}

export interface XpDiario {
  ganho_hoje: number;
  data_reset: string;
}

export interface Gamificacao {
  nivel_xp: number;
  streak_atual: number;
  streak_maior: number;
  total_minutos: number;
  conquistas: string[];
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
  simulacao_definicao?: SimulacaoDefinicao;
  preferencias: UserPreferencias;
  xp_diario: XpDiario;
    onboarding_completed: boolean;
    terms_accepted_at?: string | null;
    muscle_map_reset_at?: string | null;
    is_guest?: boolean;
}

export interface IUserDocument extends IUser {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IExerciseDocument extends IExercise {
  _id: string;
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
  _id: string;
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

export interface DashboardStats {
  treino_hoje: boolean;
  proximo_treino: string;
  treino_sugerido: TreinoSugerido | null;
  total_minutos: number;
  streak_atual: number;
  streak_maior: number;
  nivel_xp: number;
  xp_hoje: number;
  xp_diario_limite: number;
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

export interface CompleteWorkoutResponse {
  history: IWorkoutHistoryDocument;
  user: IUserDocument;
  xp_ganho: number;
  streak_celebration: StreakCelebration | null;
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
  exercicio_id?: string;
  musculo_principal: MusculoPrincipal;
  tempo_recomendado: number;
  modo: ModoExercicio;
  series: number;
  repeticoes?: number;
  tempo_seg?: number;
  descanso_seg: number;
}

export interface ActiveWorkoutConfig {
  descanso_padrao_seg: number;
}

export interface ActiveWorkout {
  treino_nome: string;
  treino_tipo: TreinoTipo;
  queue: WorkoutQueueItem[];
  config: ActiveWorkoutConfig;
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
  _id: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  nome: string;
  nivel_xp: number;
  level: number;
  streak_atual: number;
  is_me?: boolean;
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

export const REP_SCHEME_BY_NIVEL: Record<NivelUsuario, RepSchemeRecommendation[]> = {
  iniciante: [
    { id: 'vol-12x3', label: '12 × 3', series: 3, repeticoes: 12, descricao: 'Volume clássico — ideal para começar' },
    { id: 'vol-10x3', label: '10 × 3', series: 3, repeticoes: 10, descricao: 'Controle e forma antes da carga' },
    { id: 'end-15x2', label: '15 × 2', series: 2, repeticoes: 15, descricao: 'Resistência com menos séries' },
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

export const XP_DAILY_CAP = 100;

export const DEFAULT_PREFERENCIAS: UserPreferencias = {
  descanso_padrao_seg: 30,
  som_habilitado: true,
  sfx_volume: 0.7,
  ciclo_treinos: ['A', 'B', 'C'],
  modo_padrao: 'tempo',
  preset_favorito_id: null,
  tutorial_visto: false,
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
