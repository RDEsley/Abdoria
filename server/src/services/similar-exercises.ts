import type { UserDocument } from '../domain/User.js';
import {
  filterSimilarExercises,
  scoreExerciseSimilarity,
  type SimilarExerciseRef,
} from '../../../shared/similar-exercises.js';
import { findExercisesForUserDocument } from './exercise-catalog.js';
import { formatExerciseName } from '../../../shared/types/exercise-display.js';
import type { ModoExercicio, MusculoPrincipal } from '../types/index.js';

export interface SimilarExerciseResponse {
  slug: string;
  nome: string;
  musculo_principal: MusculoPrincipal;
  modo: ModoExercicio;
  prioridade?: string;
  score: number;
}

type ExerciseLike = {
  slug: string;
  nome: string;
  nome_pt?: string | null;
  musculo_principal: string;
  modo: string;
  prioridade?: string;
  ativo?: boolean;
};

function toSimilarRef(ex: ExerciseLike): SimilarExerciseRef {
  return {
    slug: ex.slug,
    musculo_principal: ex.musculo_principal as MusculoPrincipal,
    modo: ex.modo === 'reps' ? 'reps' : 'tempo',
    prioridade: ex.prioridade,
  };
}

export async function findSimilarExercisesForUser(
  user: UserDocument,
  slug: string,
  options: { queueSlugs?: string[]; limit?: number } = {},
): Promise<{ reference: SimilarExerciseRef | null; similares: SimilarExerciseResponse[] }> {
  const catalog = await findExercisesForUserDocument(user);
  const referenceDoc = catalog.find((ex) => ex.slug === slug);

  if (!referenceDoc) {
    return { reference: null, similares: [] };
  }

  const reference = toSimilarRef(referenceDoc as ExerciseLike);
  const blocked = new Set(user.preferencias?.exercicios_nao_recomendar ?? []);
  const candidates = catalog.filter((ex) => ex.ativo !== false && !blocked.has(ex.slug));

  const ranked = filterSimilarExercises(
    reference,
    candidates.map((ex) => toSimilarRef(ex as ExerciseLike)),
    {
      queueSlugs: options.queueSlugs,
      limit: options.limit ?? 12,
    },
  );

  const docBySlug = new Map(catalog.map((ex) => [ex.slug, ex as ExerciseLike]));

  const similares: SimilarExerciseResponse[] = ranked.map((ex) => ({
    slug: ex.slug,
    nome: formatExerciseName({
      nome: docBySlug.get(ex.slug)?.nome ?? ex.slug,
      slug: ex.slug,
      nome_pt: docBySlug.get(ex.slug)?.nome_pt ?? undefined,
    }),
    musculo_principal: ex.musculo_principal,
    modo: ex.modo,
    prioridade: ex.prioridade,
    score: scoreExerciseSimilarity(reference, ex),
  }));

  return { reference, similares };
}
