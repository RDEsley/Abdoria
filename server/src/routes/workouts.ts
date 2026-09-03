import { Router } from 'express';
import crypto from 'crypto';
import { Exercise } from '../domain/Exercise.js';
import { User, sanitizeUser } from '../domain/User.js';
import { WorkoutHistory } from '../domain/WorkoutHistory.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import {
  ACHIEVEMENTS,
  getAchievementUnlockPercentages,
  getWeeklyMuscles,
  hasStreakSecuredToday,
  hasTrainedToday,
  resetXpDiarioIfNeeded,
  syncUserGamification,
} from '../services/gamification.js';
import { ACHIEVEMENT_BY_ID } from '../data/achievements.js';
import { awardMoedaFromXpProgress, syncShopUnlocks } from '../services/shop.js';
import {
  applyWorkoutXpBreakdown,
  calculateWorkoutXpBreakdown,
  getDailyXpCapBreakdownForUser,
  readMoedaBalance,
} from '../services/economy.js';
import {
  getSuggestedWorkout,
  getRecommendationAlerts,
  markCycleCompleted,
} from '../services/recommendation.js';
import { isPlanoUser, markPlanoDayCompleted } from '../services/plan-generator.js';
import {
  STREAK_RECORD_MATCH_COST,
  buildStreakRecordMatch,
} from '../../../shared/streak/recovery.js';
import { getTodaySaoPaulo } from '../utils/timezone.js';
import { addDaysSaoPaulo } from '../../../shared/utils/timezone.js';
import { ActiveDays } from '../repositories/active-days-repository.js';
import type { MusculoPrincipal } from '../types/index.js';
import { xpLevelFromTotal } from '../types/index.js';
import { readInventarioSummary } from '../services/inventory.js';
import { normalizeCicloTreinos } from '../../../shared/types/index.js';
import type { TreinoBase, TreinoTipo, WorkoutExerciseEntry } from '../types/index.js';
import {
  computePersonalRecords,
  diffNewPersonalRecords,
} from '../../../shared/personal-records.js';
import { recordValidDailyAction } from '../services/active-day.js';

export const workoutsRouter = Router();

workoutsRouter.use(requireAuth);

workoutsRouter.get('/history', async (req: AuthRequest, res) => {
  try {
    const histories = await WorkoutHistory.find(
      { usuario_id: req.userId! },
      { sort: { concluido_em: -1 }, limit: 365 },
    );

    res.json(histories);
  } catch (error) {
    console.error('GET /api/workouts/history error:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
});

workoutsRouter.get('/achievements', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const pct = await getAchievementUnlockPercentages();
    res.json(
      ACHIEVEMENTS.map((a) => ({
        ...a,
        desbloqueada: user.gamificacao.conquistas.includes(a.id),
        pct_jogadores: pct[a.id] ?? 0,
      })),
    );
  } catch (error) {
    console.error('GET /api/workouts/achievements error:', error);
    res.status(500).json({ error: 'Erro ao buscar conquistas.' });
  }
});

workoutsRouter.get('/stats/recommendations', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const treinoHoje = await hasTrainedToday(user.id.toString());
    const [treinoSugerido, alertas] = await Promise.all([
      getSuggestedWorkout(user),
      getRecommendationAlerts(user),
    ]);

    res.json({
      treino_sugerido: treinoSugerido,
      alertas_recomendacao: alertas,
      proximo_treino: treinoHoje ? 'Descanso ativo' : (treinoSugerido?.nome ?? 'Treino do dia'),
    });
  } catch (error) {
    console.error('GET /api/workouts/stats/recommendations error:', error);
    res.status(500).json({ error: 'Erro ao buscar recomendações.' });
  }
});

workoutsRouter.get('/stats', async (req: AuthRequest, res) => {
  try {
    const user = await syncUserGamification(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    // Este GET pode escrever o reset de XP diário e o aviso de streak congelada.
    // Como o Início chama /stats a cada refresh, um `save()`
    // completo aqui é um dos maiores atropelos possíveis às `preferencias`
    // gravadas pelo cliente — daí o escopo explícito em cada escrita.
    if (resetXpDiarioIfNeeded(user)) {
      await user.saveColumns(['xp_diario']);
    }

    const userId = user.id.toString();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const [
      treinoHoje,
      sequenciaGarantidaHoje,
      weeklyMuscles,
      monthly,
      totalExercisesAgg,
      totalDurationAgg,
      diasAtivos7,
      diasAtivos30,
    ] = await Promise.all([
      hasTrainedToday(userId),
      hasStreakSecuredToday(userId),
      getWeeklyMuscles(userId, user.muscle_map_reset_at ?? null),
      WorkoutHistory.aggregate([
        { $match: { usuario_id: user.id, concluido_em: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$concluido_em' } },
            minutos: { $sum: { $divide: ['$duracao_total_segundos', 60] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      WorkoutHistory.aggregate([
        { $match: { usuario_id: user.id, atividade: null } },
        { $group: { _id: null, total: { $sum: { $size: '$exercicios' } } } },
      ]),
      WorkoutHistory.aggregate([
        { $match: { usuario_id: user.id, atividade: null } },
        { $group: { _id: null, total: { $sum: '$duracao_total_segundos' } } },
      ]),
      ActiveDays.countSince(userId, addDaysSaoPaulo(getTodaySaoPaulo(), -6)),
      ActiveDays.countSince(userId, addDaysSaoPaulo(getTodaySaoPaulo(), -29)),
    ]);

    const muscles = Object.entries(weeklyMuscles) as [MusculoPrincipal, number][];
    const trained = muscles.filter(([, count]) => count > 0);
    const sorted = [...trained].sort((a, b) => b[1] - a[1]);

    const achievementPct = await getAchievementUnlockPercentages();
    const conquistasOrdem = user.gamificacao.conquistas_ordem ?? [];
    const conquistas = ACHIEVEMENTS.map((a) => {
      const ordem = conquistasOrdem.indexOf(a.id);
      return {
        ...a,
        desbloqueada: user.gamificacao.conquistas.includes(a.id),
        pct_jogadores: achievementPct[a.id] ?? 0,
        ...(ordem >= 0 ? { desbloqueada_ordem: ordem } : {}),
      };
    });

    const totalSegundos = Math.round((totalDurationAgg[0] as { total?: number })?.total ?? 0);
    const inventario = readInventarioSummary(user);
    const streakFrozenNotice = Boolean(user.gamificacao.streak_freeze_notice_pending);
    if (streakFrozenNotice) {
      user.gamificacao.streak_freeze_notice_pending = false;
      await user.saveColumns(['gamificacao']);
    }

    const xpCap = getDailyXpCapBreakdownForUser(user);

    res.json({
      treino_hoje: treinoHoje,
      sequencia_garantida_hoje: sequenciaGarantidaHoje,
      proximo_treino: treinoHoje ? 'Descanso ativo' : 'Treino do dia',
      treino_sugerido: null,
      alertas_recomendacao: [],
      total_segundos: totalSegundos,
      total_minutos: Math.floor(totalSegundos / 60),
      streak_atual: user.gamificacao.streak_atual,
      streak_maior: user.gamificacao.streak_maior,
      streak_recovery_offer: user.gamificacao.streak_recovery_offer ?? null,
      nivel_xp: user.gamificacao.nivel_xp,
      xp_hoje: user.xp_diario?.ganho_hoje ?? 0,
      xp_diario_limite: xpCap.total,
      xp_diario_cap_base: xpCap.base,
      xp_diario_cap_bonus_nivel: xpCap.bonus_nivel,
      xp_diario_cap_bonus_bestiario: xpCap.bonus_bestiario,
      xp_diario_cap_bonus_conquista: xpCap.bonus_conquista,
      xp_data_reset: user.xp_diario?.data_reset ?? getTodaySaoPaulo(),
      inventario,
      frozen_streak_count: inventario.frozen_streak,
      streak_frozen_notice: streakFrozenNotice,
      conquistas,
      musculos_semana: weeklyMuscles,
      evolucao_mensal: (monthly as { _id: string; minutos: number }[]).map((m) => ({
        mes: m._id,
        minutos: Math.round(m.minutos),
      })),
      area_mais_treinada: sorted[0]?.[0] ?? null,
      area_menos_treinada: trained.length > 0 ? trained.sort((a, b) => a[1] - b[1])[0][0] : null,
      total_exercicios: (totalExercisesAgg[0] as { total?: number })?.total ?? 0,
      dias_ativos_7: diasAtivos7,
      dias_ativos_30: diasAtivos30,
    });
  } catch (error) {
    console.error('GET /api/workouts/stats error:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
  }
});

/** Usa Folhas para restaurar a sequência da oferta ativa de recuperação de streak
    (ver shared/streak/recovery.ts) — some da conta ao ser resgatada. */
workoutsRouter.post('/streak/recover', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const offer = user.gamificacao.streak_recovery_offer;
    if (!offer) {
      res.status(400).json({ error: 'Nenhuma oferta de recuperação de streak disponível.' });
      return;
    }

    const saldo = readMoedaBalance(user);
    if (saldo < offer.custo_coins) {
      res.status(400).json({
        error: `Folhas insuficientes. Faltam ${offer.custo_coins - saldo} Folhas.`,
      });
      return;
    }

    user.cosmeticos.moedas = saldo - offer.custo_coins;
    user.gamificacao.streak_atual = offer.dias_perdidos;
    user.gamificacao.streak_maior = Math.max(user.gamificacao.streak_maior, offer.dias_perdidos);
    user.gamificacao.streak_recovery_offer = null;
    user.gamificacao.streak_recovery_anchor = {
      recovered_at: getTodaySaoPaulo(),
      base_streak: offer.dias_perdidos,
    };
    user.gamificacao.streak_recoveries = [
      ...(user.gamificacao.streak_recoveries ?? []),
      {
        perdido_em: offer.perdido_em,
        dias_restaurados: offer.dias_perdidos,
        custo_coins: offer.custo_coins,
        recuperado_em: new Date().toISOString(),
      },
    ];

    await user.saveColumns(['gamificacao', 'cosmeticos']);

    res.json({
      user: sanitizeUser(user),
      streak_atual: user.gamificacao.streak_atual,
    });
  } catch (error) {
    console.error('POST /api/workouts/streak/recover error:', error);
    res.status(500).json({ error: 'Erro ao recuperar a sequência.' });
  }
});

/** Usa `STREAK_RECORD_MATCH_COST` Folhas para igualar a sequência atual
    pro recorde pessoal (tile de Streak na Evolução do perfil). */
workoutsRouter.post('/streak/match-record', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const match = buildStreakRecordMatch(
      user.gamificacao.streak_atual,
      user.gamificacao.streak_maior,
      getTodaySaoPaulo(),
    );
    if (!match) {
      res.status(400).json({ error: 'Sua sequência já está no recorde.' });
      return;
    }

    const saldo = readMoedaBalance(user);
    if (saldo < STREAK_RECORD_MATCH_COST) {
      res.status(400).json({
        error: `Folhas insuficientes. Faltam ${STREAK_RECORD_MATCH_COST - saldo} Folhas.`,
      });
      return;
    }

    user.cosmeticos.moedas = saldo - STREAK_RECORD_MATCH_COST;
    user.gamificacao.streak_atual = match.streak;
    user.gamificacao.streak_recovery_anchor = match.anchor;
    user.gamificacao.streak_recovery_offer = null;

    await user.saveColumns(['gamificacao', 'cosmeticos']);

    res.json({
      user: sanitizeUser(user),
      streak_atual: user.gamificacao.streak_atual,
    });
  } catch (error) {
    console.error('POST /api/workouts/streak/match-record error:', error);
    res.status(500).json({ error: 'Erro ao igualar a sequência ao recorde.' });
  }
});

/** Persiste histórico, recalcula streak/conquistas e aplica XP com teto diário. */
workoutsRouter.post('/complete', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const {
      treino_nome,
      treino_tipo,
      exercicios,
      duracao_total_segundos,
      plano_dia_indice,
      completion_id,
    } = req.body;

    if (!treino_nome || !Array.isArray(exercicios) || exercicios.length === 0) {
      res.status(400).json({ error: 'Dados do treino inválidos.' });
      return;
    }

    if (completion_id) {
      const existing = await WorkoutHistory.findByCompletionId(user.id, String(completion_id));
      if (existing) {
        res.json({
          history: existing,
          user: sanitizeUser(user),
          xp_ganho: existing.xp_ganho,
          abdoria_ganha: 0,
          streak_celebration: null,
          level_up: null,
        });
        return;
      }
    }

    const ciclosAtivos = normalizeCicloTreinos(
      user.preferencias?.ciclo_treinos as TreinoBase[] | undefined,
    );
    const tipoResolvido = (treino_tipo ?? 'custom') as TreinoTipo;
    if (tipoResolvido !== 'custom' && !ciclosAtivos.includes(tipoResolvido as TreinoBase)) {
      res.status(400).json({ error: 'Ciclo de treino inválido para este perfil.' });
      return;
    }

    const musculosSet = new Set<MusculoPrincipal>();
    const prevAchievements = new Set(user.gamificacao.conquistas);
    const slugs = exercicios.map((e: { slug: string }) => e.slug);
    const foundExercises = await Exercise.find({ slug: { $in: slugs } });
    const exerciseBySlug = new Map(foundExercises.map((ex) => [ex.slug, ex]));

    const resolvedExercises = exercicios.map(
      (e: {
        exercicio_id?: string;
        slug: string;
        nome: string;
        duracao_segundos: number;
        musculo_principal: MusculoPrincipal;
        series?: number;
        repeticoes_realizadas?: number;
        modo?: string;
        descanso_seg?: number;
      }) => {
        let exerciseId = e.exercicio_id;
        const found = exerciseBySlug.get(e.slug);

        if (!exerciseId) {
          exerciseId = found?.id?.toString();
        }

        musculosSet.add(e.musculo_principal);
        if (found?.musculos_secundarios) {
          for (const m of found.musculos_secundarios) {
            musculosSet.add(m as MusculoPrincipal);
          }
        }

        return {
          exercicio_id: exerciseId ?? found?.id ?? crypto.randomUUID(),
          slug: e.slug,
          nome: e.nome,
          duracao_segundos: e.duracao_segundos,
          musculo_principal: e.musculo_principal,
          series: e.series,
          repeticoes_realizadas: e.repeticoes_realizadas,
          modo: e.modo,
          descanso_seg: e.descanso_seg,
        };
      },
    );

    const musculos = [...musculosSet];
    const streakBefore = user.gamificacao.streak_atual;

    const previousHistories = await WorkoutHistory.find({ usuario_id: user.id });
    const previousRecords = computePersonalRecords(
      previousHistories as unknown as Array<{
        exercicios: WorkoutExerciseEntry[];
        concluido_em: Date | string;
      }>,
    );
    const newPersonalRecords = diffNewPersonalRecords(
      previousRecords,
      resolvedExercises as WorkoutExerciseEntry[],
    );

    const planoDiaIndice =
      plano_dia_indice != null && Number.isInteger(Number(plano_dia_indice))
        ? Number(plano_dia_indice)
        : null;

    const completion = await WorkoutHistory.createOnce({
      usuario_id: user.id,
      treino_nome,
      treino_tipo: tipoResolvido,
      exercicios: resolvedExercises,
      duracao_total_segundos: duracao_total_segundos ?? exercicios.length * 45,
      musculos_estimulados: musculos,
      concluido_em: new Date(),
      xp_ganho: 0,
      plano_dia_indice: planoDiaIndice,
      completion_id: completion_id ? String(completion_id) : null,
    });
    const history = completion.history;
    if (!completion.created) {
      res.json({
        history,
        user: sanitizeUser(user),
        xp_ganho: history.xp_ganho,
        abdoria_ganha: 0,
        moedas_ganhas: 0,
        streak_celebration: null,
        level_up: null,
      });
      return;
    }

    await recordValidDailyAction(user.id, 'workout_completed', new Date(history.concluido_em));

    const rodadaCompleta =
      planoDiaIndice != null && isPlanoUser(user)
        ? await markPlanoDayCompleted(user, planoDiaIndice)
        : await markCycleCompleted(user, tipoResolvido);

    await syncUserGamification(user.id.toString());
    const updatedUser = await User.findById(user.id);
    if (!updatedUser) {
      res.status(500).json({ error: 'Erro ao atualizar usuário.' });
      return;
    }

    const newAchievements = updatedUser.gamificacao.conquistas.filter(
      (a) => !prevAchievements.has(a),
    );
    const xpBreakdown = calculateWorkoutXpBreakdown(
      exercicios.length,
      Math.max(streakBefore, updatedUser.gamificacao.streak_atual),
      newAchievements,
    );
    const levelBefore = xpLevelFromTotal(updatedUser.gamificacao.nivel_xp);
    const xpAwarded = applyWorkoutXpBreakdown(updatedUser, xpBreakdown);
    const levelAfter = xpLevelFromTotal(updatedUser.gamificacao.nivel_xp);
    const levelUp =
      levelAfter > levelBefore ? { level_anterior: levelBefore, level_novo: levelAfter } : null;
    const abdoriaGanha = awardMoedaFromXpProgress(updatedUser);
    syncShopUnlocks(updatedUser);

    await WorkoutHistory.updateById(history.id, { xp_ganho: xpAwarded });
    await updatedUser.saveColumns(['gamificacao', 'xp_diario', 'cosmeticos']);

    const streakAfter = updatedUser.gamificacao.streak_atual;
    const streakExtended = streakAfter > streakBefore;

    res.status(201).json({
      history: { ...history, xp_ganho: xpAwarded },
      user: sanitizeUser(updatedUser),
      xp_ganho: xpAwarded,
      abdoria_ganha: abdoriaGanha,
      moedas_ganhas: abdoriaGanha,
      xp_breakdown: xpBreakdown,
      streak_celebration: streakExtended
        ? { streak_atual: streakAfter, streak_anterior: streakBefore }
        : null,
      level_up: levelUp,
      rodada_completa: rodadaCompleta,
      new_achievements: newAchievements
        .map((id) => ACHIEVEMENT_BY_ID[id])
        .filter(Boolean)
        .map((a) => ({
          id: a!.id,
          titulo: a!.titulo,
          descricao: a!.descricao,
          icon: a!.icon,
        })),
      new_personal_records: newPersonalRecords,
    });
  } catch (error) {
    console.error('POST /api/workouts/complete error:', error);
    res.status(500).json({ error: 'Erro ao salvar treino.' });
  }
});
