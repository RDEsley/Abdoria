import { createContext } from 'react';
import type { DaySnapshot } from '@/lib/api/day';
import type {
  CompleteWorkoutPayload,
  DashboardStats,
  IExerciseDocument,
  IUserDocument,
  IWorkoutHistoryDocument,
  MusculoPrincipal,
  NivelUsuario,
  RepSchemeRecommendation,
  SavedWorkoutPreset,
  StoredRepScheme,
  UserDadosSalvos,
  LevelUpCelebration,
  StreakCelebration,
  WorkoutQueueItem,
  XpBreakdown,
} from '@/types';

export interface AppContextValue {
  user: IUserDocument | null;
  exercises: IExerciseDocument[];
  stats: DashboardStats | null;
  daySnapshot: DaySnapshot | null;
  history: IWorkoutHistoryDocument[];
  customWorkout: WorkoutQueueItem[];
  customWorkoutName: string;
  savedWorkouts: SavedWorkoutPreset[];
  selectedRepSchemeIds: Partial<Record<NivelUsuario, string>>;
  repSchemesByNivel: UserDadosSalvos['esquemas_reps'];
  unlockedExercises: Set<string>;
  loading: boolean;
  exercisesLoading: boolean;
  historyLoading: boolean;
  error: string | null;
  muscleFilter: MusculoPrincipal | null;
  setMuscleFilter: (m: MusculoPrincipal | null) => void;
  /** Atualiza o usuário do contexto sem refetch (otimista ou resposta de API). */
  applyUser: (user: IUserDocument) => void;
  markStreakSecuredToday: (user: IUserDocument) => void;
  refresh: () => Promise<void>;
  loadRecommendations: (options?: { force?: boolean }) => Promise<void>;
  ensureExercises: (options?: { force?: boolean }) => Promise<void>;
  ensureHistory: (options?: { force?: boolean }) => Promise<void>;
  setCustomWorkout: (items: WorkoutQueueItem[]) => void;
  setCustomWorkoutName: (nome: string) => void;
  setSelectedRepSchemeId: (nivel: NivelUsuario, schemeId: string) => void;
  flushPendingUserDados: () => Promise<void>;
  saveWorkoutPreset: (preset: SavedWorkoutPreset) => SavedWorkoutPreset[];
  getRepSchemes: (nivel: NivelUsuario) => StoredRepScheme[];
  saveRepSchemes: (nivel: NivelUsuario, schemes: StoredRepScheme[]) => StoredRepScheme[];
  setRepSchemeConfiguration: (
    nivel: NivelUsuario,
    schemes: StoredRepScheme[],
    selectedId: string,
  ) => void;
  addRepScheme: (
    nivel: NivelUsuario,
    scheme: Omit<RepSchemeRecommendation, 'id'> & { isCustom?: boolean },
  ) => StoredRepScheme[];
  removeRepScheme: (nivel: NivelUsuario, schemeId: string) => StoredRepScheme[];
  unlockExercise: (slug: string) => Set<string>;
  unlockExercises: (slugs: string[]) => Set<string>;
  saveWorkout: (payload: CompleteWorkoutPayload) => Promise<{
    xp_ganho: number;
    abdoria_ganha: number;
    xp_breakdown: XpBreakdown | null;
    streak_celebration: StreakCelebration | null;
    level_up: LevelUpCelebration | null;
    rodada_completa: boolean;
  }>;
}

export const AppContext = createContext<AppContextValue | null>(null);
