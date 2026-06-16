import { createContext } from 'react';
import type {
  CompleteWorkoutPayload,
  DashboardStats,
  IExerciseDocument,
  IUserDocument,
  IWorkoutHistoryDocument,
  MusculoPrincipal,
  StreakCelebration,
  WorkoutQueueItem,
} from '@/types';

export interface AppContextValue {
  user: IUserDocument | null;
  exercises: IExerciseDocument[];
  stats: DashboardStats | null;
  history: IWorkoutHistoryDocument[];
  customWorkout: WorkoutQueueItem[];
  loading: boolean;
  exercisesLoading: boolean;
  historyLoading: boolean;
  error: string | null;
  muscleFilter: MusculoPrincipal | null;
  setMuscleFilter: (m: MusculoPrincipal | null) => void;
  refresh: () => Promise<void>;
  ensureExercises: () => Promise<void>;
  ensureHistory: () => Promise<void>;
  setCustomWorkout: (items: WorkoutQueueItem[]) => void;
  saveWorkout: (payload: CompleteWorkoutPayload) => Promise<{ xp_ganho: number; streak_celebration: StreakCelebration | null }>;
}

export const AppContext = createContext<AppContextValue | null>(null);
