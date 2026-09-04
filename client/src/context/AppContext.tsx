import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { showGameToast } from '@/lib/game-toast';
import {
  completeWorkout,
  getDashboardRecommendations,
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
import { getDaySnapshot, type DaySnapshot } from '@/lib/api/day';
import { AppContext } from '@/context/app-context';
import { useBootReadiness } from '@/context/boot-readiness';
import { useAuth } from '@/hooks/useAuth';
import { emitXpEarned } from '@/lib/xp-orbs';
import { queueFrozenHomeCelebration, queueStreakUpCelebration } from '@/lib/home-celebrations';
import { emitProgressionFeedback } from '@/lib/progression-feedback';
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
  const { user: authenticatedUser, applyUser: applyAuthenticatedUser } = useAuth();
  const { markDataReady } = useBootReadiness();
  const [user, setUser] = useState<IUserDocument | null>(authenticatedUser);
  const [exercises, setExercises] = useState<IExerciseDocument[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [daySnapshot, setDaySnapshot] = useState<DaySnapshot | null>(null);
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
  const recommendationsLoaded = useRef(false);
  const statsRequestVersion = useRef(0);
  const frozenNoticeShown = useRef(false);
  const initialHydrationFor = useRef<string | null>(null);

  useEffect(() => {
    userDadosRef.current = userDados;
  }, [userDados]);

  const applyUserDados = useCallback(
    (next: UserDadosSalvos, syncedUser?: IUserDocument) => {
      // Ref atualizada de forma síncrona: leitores (getRepSchemes etc.) que rodam
      // durante o MESMO render disparado por este set já enxergam o valor novo.
      userDadosRef.current = next;
      setUserDados(next);
      if (syncedUser) {
        setUser(syncedUser);
        applyAuthenticatedUser(syncedUser);
      }
    },
    [applyAuthenticatedUser],
  );

  /**
   * Atualiza só o usuário do AppContext (otimista ou resposta de API), sem
   * refetch — pra interações que precisam refletir na hora (fila de
   * atividades, preferências) sem pagar um `refresh()` completo.
   */
  const applyUser = useCallback(
    (next: IUserDocument) => {
      setUser(next);
      applyAuthenticatedUser(next);
    },
    [applyAuthenticatedUser],
  );

  /** Ignora respostas de /stats ultrapassadas e evita repetir o mesmo aviso. */
  const commitStats = useCallback(
    (next: DashboardStats, requestVersion: number) => {
      if (requestVersion !== statsRequestVersion.current) return false;

      setStats(next);
      if (next.streak_frozen_notice && !frozenNoticeShown.current) {
        frozenNoticeShown.current = true;
        const preserved =
          next.streak_frozen_event?.preserved_streak ??
          next.streak_frozen_event?.streak_atual ??
          next.streak_atual;
        queueFrozenHomeCelebration({
          userId: authenticatedUser?.id,
          preserved_streak: preserved,
          frozen_days: next.streak_frozen_event?.frozen_days ?? [],
        });
        // Frozen + ação válida já no mesmo sync: 10 protegido, depois 10 → 11.
        if (next.streak_atual > preserved) {
          queueStreakUpCelebration(
            { streak_anterior: preserved, streak_atual: next.streak_atual },
            authenticatedUser?.id,
          );
        }
      } else if (!next.streak_frozen_notice) {
        frozenNoticeShown.current = false;
      }
      return true;
    },
    [authenticatedUser?.id],
  );

  const markStreakSecuredToday = useCallback(
    (nextUser: IUserDocument) => {
      applyUser(nextUser);

      // Invalida qualquer leitura iniciada antes da conclusão. O refresh logo
      // depois recebe uma nova versão e confirma o estado salvo no servidor.
      statsRequestVersion.current += 1;
      frozenNoticeShown.current = false;
      setStats((previous) =>
        previous
          ? {
              ...previous,
              sequencia_garantida_hoje: true,
              streak_atual: nextUser.gamificacao.streak_atual,
              streak_maior: nextUser.gamificacao.streak_maior,
              streak_frozen_notice: false,
            }
          : previous,
      );
    },
    [applyUser],
  );

  const flushPersist = useCallback(async () => {
    const snapshot = pendingPersist.current;
    if (!snapshot) return;

    try {
      const result = await updateUserDados(snapshot);
      if (pendingPersist.current === snapshot) {
        pendingPersist.current = null;
      }
      applyUserDados(hydrateUserDadosFromAccount(result.user), result.user);
      if (result.xp_ganho_habilidades > 0) {
        const requestVersion = ++statsRequestVersion.current;
        const statsRes = await getDashboardStats();
        if (commitStats(statsRes, requestVersion)) {
          recommendationsLoaded.current = false;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar dados da conta');
    }
  }, [applyUserDados, commitStats]);

  const schedulePersist = useCallback(
    (patch: Partial<UserDadosSalvos>, immediate = false) => {
      pendingPersist.current = {
        ...pendingPersist.current,
        ...patch,
        esquemas_reps: patch.esquemas_reps
          ? { ...pendingPersist.current?.esquemas_reps, ...patch.esquemas_reps }
          : pendingPersist.current?.esquemas_reps,
        esquema_reps_selecionado: patch.esquema_reps_selecionado
          ? {
              ...pendingPersist.current?.esquema_reps_selecionado,
              ...patch.esquema_reps_selecionado,
            }
          : pendingPersist.current?.esquema_reps_selecionado,
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

  const flushPendingUserDados = useCallback(async () => {
    if (persistTimer.current !== null) {
      window.clearTimeout(persistTimer.current);
      persistTimer.current = null;
    }
    await flushPersist();
  }, [flushPersist]);

  const hydrateAccountData = useCallback(
    async (accountUser: IUserDocument) => {
      let dados = hydrateUserDadosFromAccount(accountUser);

      if (pendingPersist.current) {
        dados = mergeUserDadosSalvos(dados, pendingPersist.current);
      }

      if (migrationDoneFor.current !== accountUser.id) {
        migrationDoneFor.current = accountUser.id;
        const migrationPatch = buildMigrationPatch(accountUser, dados);

        if (migrationPatch) {
          try {
            const result = await updateUserDados(migrationPatch);
            clearLegacyLocalData(accountUser.id);
            dados = hydrateUserDadosFromAccount(result.user);
            applyUserDados(dados, result.user);
            dadosHydratedFor.current = accountUser.id;
            return;
          } catch {
            dados = mergeUserDadosSalvos(dados, migrationPatch);
          }
        }
      }

      applyUserDados(dados);
      dadosHydratedFor.current = accountUser.id;
    },
    [applyUserDados],
  );

  const refresh = useCallback(async () => {
    const errors: string[] = [];
    recommendationsLoaded.current = false;
    const statsVersion = ++statsRequestVersion.current;

    const [userRes, statsRes, dayRes] = await Promise.allSettled([
      getMe(),
      getDashboardStats(),
      getDaySnapshot(),
    ]);

    if (userRes.status === 'fulfilled') {
      applyUser(userRes.value);
      await hydrateAccountData(userRes.value);
    } else {
      errors.push(
        userRes.reason instanceof Error ? userRes.reason.message : 'Erro ao carregar usuário',
      );
      dadosHydratedFor.current = null;
      applyUserDados(resolveUserDadosSalvos());
    }

    if (statsRes.status === 'fulfilled') {
      commitStats(statsRes.value, statsVersion);
    } else
      errors.push(
        statsRes.reason instanceof Error
          ? statsRes.reason.message
          : 'Erro ao carregar estatísticas',
      );

    if (dayRes.status === 'fulfilled') setDaySnapshot(dayRes.value);
    else setDaySnapshot(null);

    setError(errors.length > 0 ? errors.join(' · ') : null);
    setLoading(false);
  }, [applyUser, applyUserDados, commitStats, hydrateAccountData]);

  const ensureExercises = useCallback(async (options?: { force?: boolean }) => {
    if (exercisesLoaded.current && !options?.force) return;
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

  const ensureHistory = useCallback(async (options?: { force?: boolean }) => {
    if (historyLoaded.current && !options?.force) return;
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
    if (!authenticatedUser) {
      setUser(null);
      setLoading(false);
      setDaySnapshot(null);
      initialHydrationFor.current = null;
      return;
    }

    // AuthProvider already loaded /users/me before the protected application
    // mounts. Reuse that snapshot so entering the app does not trigger a
    // second visible hydration and a redundant account request.
    setUser(authenticatedUser);
    if (initialHydrationFor.current === authenticatedUser.id) {
      setLoading(false);
      markDataReady();
      return;
    }
    initialHydrationFor.current = authenticatedUser.id;

    void (async () => {
      const statsVersion = ++statsRequestVersion.current;
      try {
        await hydrateAccountData(authenticatedUser);
        const [nextStats, nextDay] = await Promise.all([
          getDashboardStats(),
          getDaySnapshot().catch(() => null),
        ]);
        commitStats(nextStats, statsVersion);
        setDaySnapshot(nextDay);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar estatisticas');
      } finally {
        setLoading(false);
        markDataReady();
      }
    })();
  }, [authenticatedUser, commitStats, hydrateAccountData, markDataReady]);

  useEffect(() => {
    if (!error) return;
    showGameToast(error, { variant: 'error' });
  }, [error]);

  useEffect(
    () => () => {
      if (persistTimer.current !== null) {
        window.clearTimeout(persistTimer.current);
      }
      if (pendingPersist.current) {
        void flushPersist();
      }
    },
    [flushPersist],
  );

  const loadRecommendations = useCallback(async (options?: { force?: boolean }) => {
    if (recommendationsLoaded.current && !options?.force) return;
    recommendationsLoaded.current = true;
    try {
      const rec = await getDashboardRecommendations();
      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          treino_sugerido: rec.treino_sugerido,
          alertas_recomendacao: rec.alertas_recomendacao,
          proximo_treino: rec.proximo_treino,
        };
      });
    } catch {
      recommendationsLoaded.current = false;
    }
  }, []);

  const unlockedExercises = useMemo(
    () => new Set(userDados.exercicios_desbloqueados),
    [userDados.exercicios_desbloqueados],
  );

  const setCustomWorkout = useCallback(
    (items: WorkoutQueueItem[]) => {
      const next = mergeUserDadosSalvos(userDadosRef.current, { treino_personalizado: items });
      applyUserDados(next);
      schedulePersist({ treino_personalizado: items });
    },
    [applyUserDados, schedulePersist],
  );

  const setCustomWorkoutName = useCallback(
    (nome: string) => {
      const next = mergeUserDadosSalvos(userDadosRef.current, { treino_personalizado_nome: nome });
      applyUserDados(next);
      schedulePersist({ treino_personalizado_nome: nome });
    },
    [applyUserDados, schedulePersist],
  );

  const setSelectedRepSchemeId = useCallback(
    (nivel: NivelUsuario, schemeId: string) => {
      const esquema_reps_selecionado = {
        ...userDadosRef.current.esquema_reps_selecionado,
        [nivel]: schemeId,
      };
      const next = mergeUserDadosSalvos(userDadosRef.current, { esquema_reps_selecionado });
      applyUserDados(next);
      schedulePersist({ esquema_reps_selecionado: { [nivel]: schemeId } }, true);
    },
    [applyUserDados, schedulePersist],
  );

  const saveWorkoutPreset = useCallback(
    (preset: SavedWorkoutPreset) => {
      const list = userDadosRef.current.treinos_salvos;
      const index = list.findIndex((entry) => entry.id === preset.id);
      const treinos_salvos =
        index >= 0 ? list.map((entry, i) => (i === index ? preset : entry)) : [preset, ...list];
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

  /** Atualiza lista e seleção juntas: um clique, uma gravação, sem corrida entre requests. */
  const setRepSchemeConfiguration = useCallback(
    (nivel: NivelUsuario, schemes: StoredRepScheme[], selectedId: string) => {
      const patch = {
        esquemas_reps: { [nivel]: schemes },
        esquema_reps_selecionado: { [nivel]: selectedId },
      };
      const next = mergeUserDadosSalvos(userDadosRef.current, patch);
      applyUserDados(next);
      schedulePersist(patch, true);
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
      return saveRepSchemes(
        nivel,
        current.filter((scheme) => scheme.id !== schemeId),
      );
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

  /**
   * Desbloqueia vários de uma vez (1 update otimista + 1 persist), em vez de N chamadas de
   * `unlockExercise` em sequência — "Desbloquear tudo" chamando `unlockExercise` dezenas de
   * vezes disparava N `flushPersist` concorrentes (cada `schedulePersist(..., immediate: true)`
   * inicia o dela própria sem esperar a anterior terminar); quando resolviam fora de ordem, a
   * resposta de uma request MAIS VELHA (com menos itens) sobrescrevia o estado já mais novo —
   * o bug real de "destrava, buga e desbloqueia de novo o que já tinha desbloqueado".
   */
  const unlockExercises = useCallback(
    (slugs: string[]) => {
      if (slugs.length === 0) return new Set(userDadosRef.current.exercicios_desbloqueados);
      const unlocked = new Set(userDadosRef.current.exercicios_desbloqueados);
      for (const slug of slugs) unlocked.add(slug);
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
      applyUser(result.user);
      await hydrateAccountData(result.user);

      const abdoriaGanha = result.abdoria_ganha ?? result.moedas_ganhas ?? 0;
      if (abdoriaGanha > 0) {
        window.dispatchEvent(
          new CustomEvent('abdoria:coins-earned', { detail: { amount: abdoriaGanha } }),
        );
      }
      window.dispatchEvent(new Event('evolyn:quests-changed'));
      emitXpEarned(result.xp_ganho ?? 0);
      emitProgressionFeedback({
        level_up: result.level_up,
        new_achievements: result.new_achievements,
        streak_celebration: result.streak_celebration,
        userId: user?.id,
      });
      if (result.new_personal_records?.length) {
        window.dispatchEvent(
          new CustomEvent('abdoria:personal-records-unlocked', {
            detail: result.new_personal_records,
          }),
        );
      }

      const statsVersion = ++statsRequestVersion.current;
      const [statsRes, recRes, historyRes] = await Promise.allSettled([
        getDashboardStats(),
        getDashboardRecommendations(),
        getWorkoutHistory(),
      ]);

      if (statsRes.status === 'fulfilled') {
        const rec = recRes.status === 'fulfilled' ? recRes.value : null;
        const nextStats: DashboardStats = {
          ...statsRes.value,
          ...(rec
            ? {
                treino_sugerido: rec.treino_sugerido,
                alertas_recomendacao: rec.alertas_recomendacao,
                proximo_treino: rec.proximo_treino,
              }
            : {}),
        };
        if (commitStats(nextStats, statsVersion)) {
          recommendationsLoaded.current = !!rec;
        }
      }
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
        rodada_completa: result.rodada_completa ?? false,
      };
    },
    [applyUser, commitStats, hydrateAccountData],
  );

  const value = useMemo(
    () => ({
      user,
      exercises,
      stats,
      daySnapshot,
      history,
      customWorkout: userDados.treino_personalizado,
      customWorkoutName: userDados.treino_personalizado_nome,
      savedWorkouts: userDados.treinos_salvos,
      selectedRepSchemeIds: userDados.esquema_reps_selecionado,
      repSchemesByNivel: userDados.esquemas_reps,
      unlockedExercises,
      loading,
      exercisesLoading,
      historyLoading,
      error,
      muscleFilter,
      setMuscleFilter,
      applyUser,
      markStreakSecuredToday,
      refresh,
      loadRecommendations,
      ensureExercises,
      ensureHistory,
      setCustomWorkout,
      setCustomWorkoutName,
      setSelectedRepSchemeId,
      flushPendingUserDados,
      saveWorkoutPreset,
      getRepSchemes,
      saveRepSchemes,
      setRepSchemeConfiguration,
      addRepScheme,
      removeRepScheme,
      unlockExercise,
      unlockExercises,
      saveWorkout,
    }),
    [
      user,
      exercises,
      stats,
      daySnapshot,
      history,
      userDados,
      unlockedExercises,
      loading,
      exercisesLoading,
      historyLoading,
      error,
      muscleFilter,
      applyUser,
      markStreakSecuredToday,
      refresh,
      loadRecommendations,
      ensureExercises,
      ensureHistory,
      setCustomWorkout,
      setCustomWorkoutName,
      setSelectedRepSchemeId,
      flushPendingUserDados,
      saveWorkoutPreset,
      getRepSchemes,
      saveRepSchemes,
      setRepSchemeConfiguration,
      addRepScheme,
      removeRepScheme,
      unlockExercise,
      unlockExercises,
      saveWorkout,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
