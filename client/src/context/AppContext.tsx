import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  completeWorkout,
  getDashboardStats,
  getExercises,
  getMe,
  getWorkoutHistory,
} from '@/lib/api';
import { loadCustomWorkout, saveCustomWorkout } from '@/lib/custom-workout-storage';
import { AppContext } from '@/context/app-context';
import type {
  CompleteWorkoutPayload,
  DashboardStats,
  IExerciseDocument,
  IUserDocument,
  IWorkoutHistoryDocument,
  MusculoPrincipal,
  WorkoutQueueItem,
} from '@/types';

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IUserDocument | null>(null);
  const [exercises, setExercises] = useState<IExerciseDocument[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [history, setHistory] = useState<IWorkoutHistoryDocument[]>([]);
  const [customWorkout, setCustomWorkoutState] = useState<WorkoutQueueItem[]>(loadCustomWorkout);
  const [loading, setLoading] = useState(true);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muscleFilter, setMuscleFilter] = useState<MusculoPrincipal | null>(null);
  const exercisesLoaded = useRef(false);
  const historyLoaded = useRef(false);

  const refresh = useCallback(async () => {
    const errors: string[] = [];

    const [userRes, statsRes] = await Promise.allSettled([getMe(), getDashboardStats()]);

    if (userRes.status === 'fulfilled') setUser(userRes.value);
    else errors.push(userRes.reason instanceof Error ? userRes.reason.message : 'Erro ao carregar usuário');

    if (statsRes.status === 'fulfilled') setStats(statsRes.value);
    else errors.push(statsRes.reason instanceof Error ? statsRes.reason.message : 'Erro ao carregar estatísticas');

    setError(errors.length > 0 ? errors.join(' · ') : null);
    setLoading(false);
  }, []);

  const ensureExercises = useCallback(async () => {
    if (exercisesLoaded.current) return;
    exercisesLoaded.current = true;
    setExercisesLoading(true);
    try {
      const data = await getExercises();
      setExercises(data);
    } catch (err) {
      exercisesLoaded.current = false;
      setError(err instanceof Error ? err.message : 'Erro ao carregar exercícios');
    } finally {
      setExercisesLoading(false);
    }
  }, []);

  const ensureHistory = useCallback(async () => {
    if (historyLoaded.current) return;
    historyLoaded.current = true;
    setHistoryLoading(true);
    try {
      const data = await getWorkoutHistory();
      setHistory(data);
    } catch (err) {
      historyLoaded.current = false;
      setError(err instanceof Error ? err.message : 'Erro ao carregar histórico');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setCustomWorkout = useCallback((items: WorkoutQueueItem[]) => {
    setCustomWorkoutState(items);
    saveCustomWorkout(items);
  }, []);

  const saveWorkout = useCallback(
    async (payload: CompleteWorkoutPayload) => {
      const result = await completeWorkout(payload);
      setUser(result.user);

      const [statsRes, historyRes] = await Promise.allSettled([
        getDashboardStats(),
        getWorkoutHistory(),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (historyRes.status === 'fulfilled') {
        setHistory(historyRes.value);
        historyLoaded.current = true;
      }

      return {
        xp_ganho: result.xp_ganho ?? 0,
        streak_celebration: result.streak_celebration ?? null,
      };
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      exercises,
      stats,
      history,
      customWorkout,
      loading,
      exercisesLoading,
      historyLoading,
      error,
      muscleFilter,
      setMuscleFilter,
      refresh,
      ensureExercises,
      ensureHistory,
      setCustomWorkout,
      saveWorkout,
    }),
    [
      user,
      exercises,
      stats,
      history,
      customWorkout,
      loading,
      exercisesLoading,
      historyLoading,
      error,
      muscleFilter,
      refresh,
      ensureExercises,
      ensureHistory,
      setCustomWorkout,
      saveWorkout,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
