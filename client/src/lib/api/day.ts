import { fetchJson } from './client';
import type { EvolynInsight } from '@shared/activities';

export interface DaySnapshot {
  day_key: string;
  dia_ativo_garantido: boolean;
  streak_atual: number;
  streak_maior: number;
  xp_hoje: number;
  treino_hoje: boolean;
  occurrences: import('@shared/activities').ActivityOccurrence[];
  routines: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    items_total: number;
    items_done: number;
  }>;
  next_up: Array<{ kind: 'workout' | 'activity' | 'routine'; title: string; href: string }>;
  week: Array<{
    day_key: string;
    active: boolean;
    workouts: number;
    activities: number;
    xp: number;
    frozen: boolean;
  }>;
  dias_ativos_30: number;
  insight: EvolynInsight | null;
  momentum?: {
    current_period: 'manha' | 'tarde' | 'noite';
    periods: {
      manha: { planned: number; done: number };
      tarde: { planned: number; done: number };
      noite: { planned: number; done: number };
    };
  };
  week_retro?: {
    active_days: number;
    active_days_prev: number;
    workouts: number;
    workouts_prev: number;
    activities: number;
    activities_prev: number;
    xp: number;
    xp_prev: number;
    best_day: string | null;
    best_day_xp: number;
  };
}

export function getDaySnapshot(): Promise<DaySnapshot> {
  return fetchJson('/day');
}

export function getInsights(): Promise<EvolynInsight[]> {
  return fetchJson('/insights');
}
