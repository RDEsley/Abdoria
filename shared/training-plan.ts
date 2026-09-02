/**
 * Geração do plano de treino corpo-todo (Grupo H).
 * Funções puras compartilhadas: o server gera/persiste o plano e o client
 * usa a mesma lógica pra pré-visualizar no onboarding sem roundtrip.
 */

import type {
  Foco,
  MusculoPrincipal,
  ParteCorpo,
  PerfilTreino,
  PlanoDia,
  PlanoTreino,
} from './types/index.js';
import { PARTE_CORPO_LABELS } from './types/index.js';

/** Semanas do mesociclo — ao fim da 4ª, o multiplicador volta ao início. */
export const PROGRESSION_WEEKS = 4;

/** Incremento de volume por semana do mesociclo (semana 1 = 1.0). */
export function weeklyMultiplier(semana: number): number {
  const clamped = Math.min(Math.max(semana, 1), PROGRESSION_WEEKS);
  return 1 + 0.05 * (clamped - 1);
}

/** Exercícios por sessão conforme o tempo disponível declarado. */
export const SESSION_EXERCISE_COUNT: Record<PerfilTreino['tempo_por_sessao_min'], number> = {
  10: 4,
  20: 6,
  30: 8,
  45: 10,
};

export interface FocoParams {
  series: number;
  /** Multiplicador sobre as repetições-base do exercício no nível do usuário. */
  reps_factor: number;
  /** Multiplicador sobre o tempo-base (exercícios de tempo/isometria). */
  tempo_factor: number;
  descanso_seg: number;
}

export const FOCO_PARAMS: Record<Foco, FocoParams> = {
  forca: { series: 4, reps_factor: 0.6, tempo_factor: 0.9, descanso_seg: 60 },
  hipertrofia: { series: 4, reps_factor: 0.8, tempo_factor: 1.0, descanso_seg: 45 },
  definicao: { series: 3, reps_factor: 1.0, tempo_factor: 1.0, descanso_seg: 30 },
  resistencia: { series: 3, reps_factor: 1.3, tempo_factor: 1.25, descanso_seg: 20 },
  saude: { series: 3, reps_factor: 0.9, tempo_factor: 1.0, descanso_seg: 40 },
};

export const REPS_MIN = 4;
export const REPS_MAX = 30;
export const TEMPO_SEG_MIN = 10;
export const TEMPO_SEG_MAX = 600;

/** Aplica foco + progressão semanal sobre as repetições-base do exercício. */
export function doseReps(baseReps: number, foco: Foco, semana: number): number {
  const raw = baseReps * FOCO_PARAMS[foco].reps_factor * weeklyMultiplier(semana);
  return Math.min(Math.max(Math.round(raw), REPS_MIN), REPS_MAX);
}

/** Aplica foco + progressão semanal sobre o tempo-base (segundos). */
export function doseTempoSeg(baseTempo: number, foco: Foco, semana: number): number {
  const raw = baseTempo * FOCO_PARAMS[foco].tempo_factor * weeklyMultiplier(semana);
  const rounded = Math.round(raw / 5) * 5;
  return Math.min(Math.max(rounded, TEMPO_SEG_MIN), TEMPO_SEG_MAX);
}

/** Partes derivadas do foco quando o usuário escolhe "recomendado" (abs é implícito). */
export function derivePartesFromFoco(foco: Foco): ParteCorpo[] {
  switch (foco) {
    case 'definicao':
      return ['peito', 'pernas', 'costas'];
    case 'forca':
    case 'hipertrofia':
      return ['peito', 'costas', 'pernas', 'bracos', 'ombros'];
    case 'resistencia':
    case 'saude':
      return ['peito', 'costas', 'bracos', 'ombros', 'pernas', 'gluteos'];
  }
}

interface SplitDayTemplate {
  /** Grupos-alvo do dia, sem core: o abdômen entra em todo dia de treino do plano. */
  grupos: ParteCorpo[];
}

/** Splits por frequência semanal. Dia sem grupos vira sessão dedicada de core. */
export const SPLIT_TEMPLATES: Record<number, SplitDayTemplate[]> = {
  2: [{ grupos: ['peito', 'ombros', 'pernas'] }, { grupos: ['costas', 'bracos', 'gluteos'] }],
  3: [
    { grupos: ['peito', 'bracos'] },
    { grupos: ['pernas', 'gluteos'] },
    { grupos: ['costas', 'ombros'] },
  ],
  4: [
    { grupos: ['peito', 'costas', 'bracos', 'ombros'] },
    { grupos: ['pernas', 'gluteos'] },
    { grupos: ['peito', 'costas', 'bracos', 'ombros'] },
    { grupos: ['pernas', 'gluteos'] },
  ],
  5: [
    { grupos: ['peito', 'ombros', 'bracos'] },
    { grupos: ['costas', 'bracos'] },
    { grupos: ['pernas', 'gluteos'] },
    { grupos: [] },
    { grupos: ['peito', 'costas', 'pernas'] },
  ],
  6: [
    { grupos: ['peito', 'ombros', 'bracos'] },
    { grupos: ['costas', 'bracos'] },
    { grupos: ['pernas', 'gluteos'] },
    { grupos: ['peito', 'ombros', 'bracos'] },
    { grupos: ['costas', 'bracos'] },
    { grupos: ['pernas', 'gluteos'] },
  ],
  7: [
    { grupos: ['peito', 'ombros', 'bracos'] },
    { grupos: ['costas', 'bracos'] },
    { grupos: ['pernas', 'gluteos'] },
    { grupos: [] },
    { grupos: ['peito', 'ombros', 'bracos'] },
    { grupos: ['costas', 'bracos'] },
    { grupos: ['pernas', 'gluteos'] },
  ],
};

/** Rotação de ênfase abdominal entre os dias (preserva a lógica dos ciclos A–D). */
export const ABS_ENFASE_ROTATION: MusculoPrincipal[] = ['superior', 'obliquos', 'inferior', 'core'];

function tituloDoDia(indice: number, grupos: ParteCorpo[]): string {
  const principais = grupos.filter((g) => g !== 'abdomen').slice(0, 2);
  const foco =
    principais.length > 0
      ? principais.map((g) => PARTE_CORPO_LABELS[g]).join(' + ')
      : PARTE_CORPO_LABELS.abdomen;
  return `Treino ${indice + 1} — ${foco}`;
}

/** Frequência aceita pelo gerador (fora disso, aproxima pro limite). */
export function clampFrequencia(frequencia: number): number {
  return Math.min(Math.max(Math.round(frequencia || 3), 2), 7);
}

/** True quando o dia (0=Dom..6=Sáb) é de descanso segundo os dias fixos do perfil. */
export function isRestDay(perfil: PerfilTreino | null | undefined, dow: number): boolean {
  const dias = perfil?.dias_semana;
  if (!dias || dias.length === 0) return false;
  return !dias.includes(dow);
}

/**
 * Gera o esqueleto do plano semanal a partir do perfil.
 * Retorna null no escopo só-abdômen — esse modo continua no pipeline de
 * presets por ciclo (A–E), que é curado e superior pro catálogo abdominal.
 */
export function buildPlanoTreino(perfil: PerfilTreino, geradoEm: string): PlanoTreino | null {
  if (perfil.escopo !== 'corpo_todo') return null;

  const partes = new Set(
    perfil.partes && perfil.partes.length > 0 ? perfil.partes : derivePartesFromFoco(perfil.foco),
  );
  partes.add('abdomen');

  const template = SPLIT_TEMPLATES[clampFrequencia(perfil.frequencia_semanal)];

  const dias: PlanoDia[] = template.map((day, indice) => {
    const grupos: ParteCorpo[] = [...day.grupos.filter((g) => partes.has(g)), 'abdomen'];
    return {
      indice,
      titulo: tituloDoDia(indice, grupos),
      ciclo_id: null,
      grupos,
      enfase_abs: ABS_ENFASE_ROTATION[indice % ABS_ENFASE_ROTATION.length],
    };
  });

  return {
    versao: 1,
    gerado_em: geradoEm,
    semana_atual: 1,
    dias,
    dias_completados_rodada: [],
  };
}
