import type { ModoExercicio, PersonalRecordNotice, WorkoutExerciseEntry } from './types/index.js';

export interface ExercisePersonalRecord {
  slug: string;
  nome: string;
  modo: ModoExercicio;
  melhor_valor: number;
  unidade: 'reps' | 'segundos';
  concluido_em: string;
}

/**
 * Volume da sessão para o exercício: série × repetições (modo reps) ou
 * série × duração do hold (modo tempo). Cresce de verdade com o nível do
 * usuário e o esquema de reps escolhido, mesmo sem input livre de esforço.
 */
function exerciseVolume(
  ex: Pick<WorkoutExerciseEntry, 'modo' | 'series' | 'repeticoes_realizadas' | 'duracao_segundos'>,
): number {
  const series = ex.series ?? 1;
  if (ex.modo === 'tempo') return series * (ex.duracao_segundos ?? 0);
  return series * (ex.repeticoes_realizadas ?? 0);
}

export function computePersonalRecords(
  histories: Array<{ exercicios: WorkoutExerciseEntry[]; concluido_em: Date | string }>,
): Map<string, ExercisePersonalRecord> {
  const records = new Map<string, ExercisePersonalRecord>();
  for (const history of histories) {
    for (const ex of history.exercicios) {
      if (!ex.modo) continue;
      const valor = exerciseVolume(ex);
      if (valor <= 0) continue;
      const current = records.get(ex.slug);
      if (current && valor <= current.melhor_valor) continue;
      records.set(ex.slug, {
        slug: ex.slug,
        nome: ex.nome,
        modo: ex.modo,
        melhor_valor: valor,
        unidade: ex.modo === 'tempo' ? 'segundos' : 'reps',
        concluido_em:
          typeof history.concluido_em === 'string'
            ? history.concluido_em
            : history.concluido_em.toISOString(),
      });
    }
  }
  return records;
}

/** Compara o volume da sessão recém-concluída contra os recordes anteriores (exclui esta sessão). */
export function diffNewPersonalRecords(
  previous: Map<string, ExercisePersonalRecord>,
  currentExercises: WorkoutExerciseEntry[],
): PersonalRecordNotice[] {
  const sessionBest = new Map<string, { nome: string; modo: ModoExercicio; valor: number }>();
  for (const ex of currentExercises) {
    if (!ex.modo) continue;
    const valor = exerciseVolume(ex);
    if (valor <= 0) continue;
    const existing = sessionBest.get(ex.slug);
    if (!existing || valor > existing.valor) {
      sessionBest.set(ex.slug, { nome: ex.nome, modo: ex.modo, valor });
    }
  }

  const notices: PersonalRecordNotice[] = [];
  for (const [slug, ex] of sessionBest) {
    const prev = previous.get(slug);
    if (prev && ex.valor > prev.melhor_valor) {
      notices.push({
        slug,
        nome: ex.nome,
        modo: ex.modo,
        valor_anterior: prev.melhor_valor,
        valor_novo: ex.valor,
        unidade: ex.modo === 'tempo' ? 'segundos' : 'reps',
      });
    }
  }
  return notices;
}
