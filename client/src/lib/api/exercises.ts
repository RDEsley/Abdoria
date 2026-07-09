import type { ExerciseFilters, IExerciseDocument } from '@/types';
import { fetchJson } from './client';

export function getExercises(filters: ExerciseFilters = {}): Promise<IExerciseDocument[]> {
  const params = new URLSearchParams();
  if (filters.musculo) params.set('musculo', filters.musculo);
  if (filters.nivel !== undefined) params.set('nivel', String(filters.nivel));
  if (filters.prioridade) params.set('prioridade', filters.prioridade);
  const query = params.toString();
  return fetchJson(`/exercises${query ? `?${query}` : ''}`);
}

export interface SimilarExercisesResponse {
  reference: {
    slug: string;
    musculo_principal: string;
    modo: string;
    prioridade?: string;
  } | null;
  similares: Array<{
    slug: string;
    nome: string;
    musculo_principal: string;
    modo: string;
    prioridade?: string;
    score: number;
  }>;
}

export function getSimilarExercises(
  slug: string,
  queueSlugs: string[] = [],
): Promise<SimilarExercisesResponse> {
  const params = new URLSearchParams({ slug });
  if (queueSlugs.length > 0) params.set('queueSlugs', queueSlugs.join(','));
  return fetchJson(`/exercises/similar?${params.toString()}`);
}
