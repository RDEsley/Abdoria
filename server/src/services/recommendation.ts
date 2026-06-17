import { Exercise } from '../models/Exercise.js';
import { WorkoutHistory } from '../models/WorkoutHistory.js';
import { WorkoutPreset } from '../models/WorkoutPreset.js';
import type { UserDocument } from '../models/User.js';
import type { ModoExercicio, TreinoBase, TreinoSugerido } from '../types/index.js';
import { formatExerciseName } from '../../../shared/types/exercise-display.js';

function resolveNextCiclo(ciclo: TreinoBase[], lastTipo?: string | null): TreinoBase {
  if (!lastTipo || lastTipo === 'custom' || !ciclo.includes(lastTipo as TreinoBase)) {
    return ciclo[0];
  }
  const idx = ciclo.indexOf(lastTipo as TreinoBase);
  return ciclo[(idx + 1) % ciclo.length];
}

/** Próximo treino sugerido com exercícios resolvidos para o dashboard e construtor. */
export async function getSuggestedWorkout(user: UserDocument): Promise<TreinoSugerido | null> {
  const ciclo = (user.preferencias?.ciclo_treinos ?? ['A', 'B', 'C']) as TreinoBase[];

  const last = await WorkoutHistory.findOne({ usuario_id: user._id })
    .sort({ concluido_em: -1 })
    .select('treino_tipo')
    .lean();

  const nextCiclo = resolveNextCiclo(ciclo, last?.treino_tipo);

  const preset =
    (await WorkoutPreset.findOne({
      nivel: user.nivel,
      objetivo: user.objetivo,
      ciclo_id: nextCiclo,
      recomendado: true,
    }).lean()) ??
    (await WorkoutPreset.findOne({
      nivel: user.nivel,
      ciclo_id: nextCiclo,
      recomendado: true,
    }).lean()) ??
    (await WorkoutPreset.findOne({ ciclo_id: nextCiclo, recomendado: true }).lean());

  if (!preset) return null;

  const slugs = preset.exercicios.map((e) => e.slug);
  const exercises = await Exercise.find({ slug: { $in: slugs }, ativo: true })
    .select('slug nome nome_pt')
    .lean();
  const nameBySlug = new Map(
    exercises.map((e) => [
      e.slug,
      formatExerciseName({ nome: e.nome, slug: e.slug, nome_pt: e.nome_pt ?? undefined }),
    ]),
  );

  const exercicios = preset.exercicios.map((pe) => ({
    slug: pe.slug,
    nome: nameBySlug.get(pe.slug) ?? pe.slug,
    series: pe.series,
    modo: pe.modo as ModoExercicio,
    repeticoes: pe.repeticoes ?? undefined,
    tempo_seg: pe.tempo_seg ?? undefined,
    descanso_seg: pe.descanso_seg,
  }));

  return {
    preset_id: preset._id.toString(),
    ciclo_id: preset.ciclo_id,
    nome: preset.nome,
    descricao: preset.descricao,
    total_exercicios: exercicios.length,
    exercicios,
    primeiro_exercicio: exercicios[0]?.nome ?? null,
  };
}
