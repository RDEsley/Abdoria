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
