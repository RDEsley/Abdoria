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
  updateUserDados,
} from '@/lib/api';
import {
  buildMigrationPatch,
  clearLegacyLocalData,
  getRepSchemesForNivel,
  hydrateUserDadosFromAccount,
  mergeUserDadosSalvos,
} from '@/lib/user-dados';
import { AppContext } from '@/context/app-context';
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
  WorkoutQueueItem,
} from '@/types';
import { resolveUserDadosSalvos } from '@/types';

const PERSIST_DEBOUNCE_MS = 450;

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IUserDocument | null>(null);
  const [exercises, setExercises] = useState<IExerciseDocument[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [history, setHistory] = useState<IWorkoutHistoryDocument[]>([]);
  const [userDados, setUserDados] = useState<UserDadosSalvos>(() => resolveUserDadosSalvos());
  const [loading, setLoading] = useState(true);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muscleFilter, setMuscleFilter] = useState<MusculoPrincipal | null>(null);
  const exercisesLoaded = useRef(false);
  const historyLoaded = useRef(false);
  const dadosHydratedFor = useRef<string | null>(null);
  const migrationDoneFor = useRef<string | null>(null);
  const persistTimer = useRef<number | null>(null);
  const pendingPersist = useRef<Partial<UserDadosSalvos> | null>(null);
  const userDadosRef = useRef(userDados);

  useEffect(() => {
    userDadosRef.current = userDados;
  }, [userDados]);

  const applyUserDados = useCallback((next: UserDadosSalvos, syncedUser?: IUserDocument) => {
    setUserDados(next);
    if (syncedUser) {
      setUser(syncedUser);
      window.dispatchEvent(new CustomEvent('abdoria:user-updated', { detail: syncedUser }));
    }
  }, []);

  const flushPersist = useCallback(async () => {
    const patch = pendingPersist.current;
    pendingPersist.current = null;
    if (!patch) return;

    try {
      const result = await updateUserDados(patch);
      applyUserDados(hydrateUserDadosFromAccount(result.user), result.user);
      if (result.xp_ganho_habilidades > 0) {
        const statsRes = await getDashboardStats();
        setStats(statsRes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar dados da conta');
    }
  }, [applyUserDados]);

  const schedulePersist = useCallback(
    (patch: Partial<UserDadosSalvos>, immediate = false) => {
      pendingPersist.current = {
        ...pendingPersist.current,
        ...patch,
        esquemas_reps: patch.esquemas_reps
          ? { ...pendingPersist.current?.esquemas_reps, ...patch.esquemas_reps }
          : pendingPersist.current?.esquemas_reps,
      };

      if (persistTimer.current !== null) {
        window.clearTimeout(persistTimer.current);
        persistTimer.current = null;
      }

      if (immediate) {
        void flushPersist();
        return;
      }

      persistTimer.current = window.setTimeout(() => {
        persistTimer.current = null;
        void flushPersist();
      }, PERSIST_DEBOUNCE_MS);
    },
    [flushPersist],
  );

  const hydrateAccountData = useCallback(
    async (accountUser: IUserDocument) => {
      let dados = hydrateUserDadosFromAccount(accountUser);

      if (migrationDoneFor.current !== accountUser._id) {
        migrationDoneFor.current = accountUser._id;
        const migrationPatch = buildMigrationPatch(accountUser, dados);

        if (migrationPatch) {
          try {
            const result = await updateUserDados(migrationPatch);
            clearLegacyLocalData(accountUser._id);
            dados = hydrateUserDadosFromAccount(result.user);
            applyUserDados(dados, result.user);
            dadosHydratedFor.current = accountUser._id;
            return;
          } catch {
            dados = mergeUserDadosSalvos(dados, migrationPatch);
          }
        }
      }

      applyUserDados(dados);
      dadosHydratedFor.current = accountUser._id;
    },
    [applyUserDados],
  );

  const refresh = useCallback(async () => {
    const errors: string[] = [];

    const [userRes, statsRes] = await Promise.allSettled([getMe(), getDashboardStats()]);

    if (userRes.status === 'fulfilled') {
      setUser(userRes.value);
      await hydrateAccountData(userRes.value);
    } else {
      errors.push(userRes.reason instanceof Error ? userRes.reason.message : 'Erro ao carregar usuário');
      dadosHydratedFor.current = null;
      applyUserDados(resolveUserDadosSalvos());
    }

    if (statsRes.status === 'fulfilled') setStats(statsRes.value);
    else errors.push(statsRes.reason instanceof Error ? statsRes.reason.message : 'Erro ao carregar estatísticas');

    setError(errors.length > 0 ? errors.join(' · ') : null);
    setLoading(false);
  }, [applyUserDados, hydrateAccountData]);

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

  useEffect(() => () => {
    if (persistTimer.current !== null) {
      window.clearTimeout(persistTimer.current);
    }
  }, []);

  const setCustomWorkout = useCallback(
    (items: WorkoutQueueItem[]) => {
      const next = mergeUserDadosSalvos(userDadosRef.current, { treino_personalizado: items });
      applyUserDados(next);
      schedulePersist({ treino_personalizado: items });
    },
    [applyUserDados, schedulePersist],
  );

  const saveWorkoutPreset = useCallback(
    (preset: SavedWorkoutPreset) => {
      const list = userDadosRef.current.treinos_salvos;
      const index = list.findIndex((entry) => entry.id === preset.id);
      const treinos_salvos = index >= 0
        ? list.map((entry, i) => (i === index ? preset : entry))
        : [preset, ...list];
      const next = mergeUserDadosSalvos(userDadosRef.current, { treinos_salvos });
      applyUserDados(next);
      schedulePersist({ treinos_salvos }, true);
      return treinos_salvos;
    },
    [applyUserDados, schedulePersist],
  );

  const getRepSchemes = useCallback(
    (nivel: NivelUsuario) => getRepSchemesForNivel(userDadosRef.current, nivel),
    [],
  );

  const saveRepSchemes = useCallback(
    (nivel: NivelUsuario, schemes: StoredRepScheme[]) => {
      const next = mergeUserDadosSalvos(userDadosRef.current, {
        esquemas_reps: { [nivel]: schemes },
      });
      applyUserDados(next);
      schedulePersist({ esquemas_reps: { [nivel]: schemes } }, true);
      return schemes;
    },
    [applyUserDados, schedulePersist],
  );

  const addRepScheme = useCallback(
    (nivel: NivelUsuario, scheme: Omit<RepSchemeRecommendation, 'id'> & { isCustom?: boolean }) => {
      const current = getRepSchemesForNivel(userDadosRef.current, nivel);
      const entry: StoredRepScheme = {
        ...scheme,
        id: `custom-${Date.now()}`,
        isCustom: scheme.isCustom ?? true,
      };
      return saveRepSchemes(nivel, [entry, ...current]);
    },
    [saveRepSchemes],
  );

  const removeRepScheme = useCallback(
    (nivel: NivelUsuario, schemeId: string) => {
      const current = getRepSchemesForNivel(userDadosRef.current, nivel);
      return saveRepSchemes(nivel, current.filter((scheme) => scheme.id !== schemeId));
    },
    [saveRepSchemes],
  );

  const unlockExercise = useCallback(
    (slug: string) => {
      const unlocked = new Set(userDadosRef.current.exercicios_desbloqueados);
      unlocked.add(slug);
      const exercicios_desbloqueados = [...unlocked];
      const next = mergeUserDadosSalvos(userDadosRef.current, { exercicios_desbloqueados });
      applyUserDados(next);
      schedulePersist({ exercicios_desbloqueados }, true);
      return unlocked;
    },
    [applyUserDados, schedulePersist],
  );

  const saveWorkout = useCallback(
    async (payload: CompleteWorkoutPayload) => {
      const result = await completeWorkout(payload);
      setUser(result.user);
      await hydrateAccountData(result.user);
      window.dispatchEvent(new CustomEvent('abdoria:user-updated', { detail: result.user }));

      const abdoriaGanha = result.abdoria_ganha ?? result.moedas_ganhas ?? 0;
      if (abdoriaGanha > 0) {
        window.dispatchEvent(
          new CustomEvent('abdoria:coins-earned', { detail: { amount: abdoriaGanha } }),
        );
      }
      if (result.level_up) {
        window.dispatchEvent(new CustomEvent('abdoria:level-up', { detail: result.level_up }));
      }

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
        abdoria_ganha: result.abdoria_ganha ?? result.moedas_ganhas ?? 0,
        xp_breakdown: result.xp_breakdown ?? null,
        streak_celebration: result.streak_celebration ?? null,
        level_up: result.level_up ?? null,
      };
    },
    [hydrateAccountData],
  );

  const value = useMemo(
    () => ({
      user,
      exercises,
      stats,
      history,
      customWorkout: userDados.treino_personalizado,
      savedWorkouts: userDados.treinos_salvos,
      unlockedExercises: new Set(userDados.exercicios_desbloqueados),
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
      saveWorkoutPreset,
      getRepSchemes,
      saveRepSchemes,
      addRepScheme,
      removeRepScheme,
      unlockExercise,
      saveWorkout,
    }),
    [
      user,
      exercises,
      stats,
      history,
      userDados,
      loading,
      exercisesLoading,
      historyLoading,
      error,
      muscleFilter,
      refresh,
      ensureExercises,
      ensureHistory,
      setCustomWorkout,
      saveWorkoutPreset,
      getRepSchemes,
      saveRepSchemes,
      addRepScheme,
      removeRepScheme,
      unlockExercise,
      saveWorkout,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
