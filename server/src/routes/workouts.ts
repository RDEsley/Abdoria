import { Router } from 'express';
import crypto from 'crypto';
import { Exercise } from '../models/Exercise.js';
import { User, sanitizeUser } from '../models/User.js';
import { WorkoutHistory } from '../models/WorkoutHistory.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import {
  ACHIEVEMENTS,
  getWeeklyMuscles,
  hasTrainedToday,
  resetXpDiarioIfNeeded,
  syncUserGamification,
} from '../services/gamification.js';
import { awardAbdoriaFromXpProgress, syncShopUnlocks } from '../services/shop.js';
import {
  awardBonusXp,
  awardDailyExerciseXp,
  calculateWorkoutXpBreakdown,
} from '../services/economy.js';
import { getSuggestedWorkout, getRecommendationAlerts, markCycleCompleted } from '../services/recommendation.js';
import { getTodaySaoPaulo } from '../utils/timezone.js';
import type { MusculoPrincipal } from '../types/index.js';
import { xpLevelFromTotal } from '../types/index.js';
import { getDailyXpCapForUser } from '../services/economy.js';
import { readInventarioSummary } from '../services/inventory.js';
import { syncAfkRewards } from '../services/afk.js';
import { normalizePending } from '../repositories/user-repository.js';

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

    res.json(
      ACHIEVEMENTS.map((a) => ({
        ...a,
        desbloqueada: user.gamificacao.conquistas.includes(a.id),
      })),
    );
  } catch (error) {
    console.error('GET /api/workouts/achievements error:', error);
    res.status(500).json({ error: 'Erro ao buscar conquistas.' });
  }
});

workoutsRouter.get('/stats', async (req: AuthRequest, res) => {
  try {
    let user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    await syncUserGamification(user._id.toString());
    user = (await User.findById(req.userId!))!;

    if (resetXpDiarioIfNeeded(user)) {
      await user.save();
    }

    syncAfkRewards(user);
    await user.save();

    const userId = user._id.toString();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const [treinoHoje, weeklyMuscles, monthly, totalExercisesAgg, totalDurationAgg, treinoSugerido, alertas] = await Promise.all([
      hasTrainedToday(userId),
      getWeeklyMuscles(userId, user.muscle_map_reset_at ?? null),
      WorkoutHistory.aggregate([
        { $match: { usuario_id: user._id, concluido_em: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$concluido_em' } },
            minutos: { $sum: { $divide: ['$duracao_total_segundos', 60] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      WorkoutHistory.aggregate([
        { $match: { usuario_id: user._id } },
        { $group: { _id: null, total: { $sum: { $size: '$exercicios' } } } },
      ]),
      WorkoutHistory.aggregate([
        { $match: { usuario_id: user._id } },
        { $group: { _id: null, total: { $sum: '$duracao_total_segundos' } } },
      ]),
      getSuggestedWorkout(user),
      getRecommendationAlerts(user),
    ]);

    const muscles = Object.entries(weeklyMuscles) as [MusculoPrincipal, number][];
    const trained = muscles.filter(([, count]) => count > 0);
    const sorted = [...trained].sort((a, b) => b[1] - a[1]);

    const conquistas = ACHIEVEMENTS.map((a) => ({
      ...a,
      desbloqueada: user.gamificacao.conquistas.includes(a.id),
    }));

    const totalSegundos = Math.round((totalDurationAgg[0] as { total?: number })?.total ?? 0);
    const pending = normalizePending(user.afk?.pending);

    res.json({
      treino_hoje: treinoHoje,
      proximo_treino: treinoHoje
        ? 'Descanso ativo'
        : treinoSugerido?.nome ?? 'Treino do dia',
      treino_sugerido: treinoSugerido,
      alertas_recomendacao: alertas,
      total_segundos: totalSegundos,
      total_minutos: Math.floor(totalSegundos / 60),
      streak_atual: user.gamificacao.streak_atual,
      streak_maior: user.gamificacao.streak_maior,
      nivel_xp: user.gamificacao.nivel_xp,
      xp_hoje: user.xp_diario?.ganho_hoje ?? 0,
      xp_extra_hoje: user.xp_diario?.extra_hoje ?? 0,
      xp_diario_limite: getDailyXpCapForUser(user),
      xp_bonus_restante: user.xp_diario?.bonus_pool_restante ?? 0,
      xp_bonus_total: user.xp_diario?.bonus_pool_total ?? 0,
      xp_data_reset: user.xp_diario?.data_reset ?? getTodaySaoPaulo(),
      inventario: readInventarioSummary(user),
      afk: {
        minutos_acumulados: user.afk?.minutos_acumulados ?? 0,
        pending,
        has_rewards: Boolean(
          pending.xp > 0
          || pending.abdoria > 0
          || pending.energy_drinks > 0
          || pending.cosmetic_ids.length > 0
          || pending.titulo_secreto,
        ),
      },
      energy_drink_count: readInventarioSummary(user).energy_drink,
      conquistas,
      musculos_semana: weeklyMuscles,
      evolucao_mensal: (monthly as { _id: string; minutos: number }[]).map((m) => ({ mes: m._id, minutos: Math.round(m.minutos) })),
      area_mais_treinada: sorted[0]?.[0] ?? null,
      area_menos_treinada: trained.length > 0 ? trained.sort((a, b) => a[1] - b[1])[0][0] : null,
      total_exercicios: (totalExercisesAgg[0] as { total?: number })?.total ?? 0,
    });
  } catch (error) {
    console.error('GET /api/workouts/stats error:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
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

    const { treino_nome, treino_tipo, exercicios, duracao_total_segundos } = req.body;

    if (!treino_nome || !Array.isArray(exercicios) || exercicios.length === 0) {
      res.status(400).json({ error: 'Dados do treino inválidos.' });
      return;
    }

    const musculosSet = new Set<MusculoPrincipal>();
    const prevAchievements = new Set(user.gamificacao.conquistas);
    const slugs = exercicios.map((e: { slug: string }) => e.slug);
    const foundExercises = await Exercise.find({ slug: { $in: slugs } });
    const exerciseBySlug = new Map(foundExercises.map((ex) => [ex.slug, ex]));

    const resolvedExercises = exercicios.map((e: {
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
        exerciseId = found?._id?.toString();
      }

      musculosSet.add(e.musculo_principal);
      if (found?.musculos_secundarios) {
        for (const m of found.musculos_secundarios) {
          musculosSet.add(m as MusculoPrincipal);
        }
      }

      return {
        exercicio_id: exerciseId ?? found?._id ?? crypto.randomUUID(),
        slug: e.slug,
        nome: e.nome,
        duracao_segundos: e.duracao_segundos,
        musculo_principal: e.musculo_principal,
        series: e.series,
        repeticoes_realizadas: e.repeticoes_realizadas,
        modo: e.modo,
        descanso_seg: e.descanso_seg,
      };
    });

    const musculos = [...musculosSet];
    const streakBefore = user.gamificacao.streak_atual;

    const history = await WorkoutHistory.create({
      usuario_id: user._id,
      treino_nome,
      treino_tipo,
      exercicios: resolvedExercises,
      duracao_total_segundos: duracao_total_segundos ?? exercicios.length * 45,
      musculos_estimulados: musculos,
      concluido_em: new Date(),
      xp_ganho: 0,
    });

    const rodadaCompleta = await markCycleCompleted(user, treino_tipo);

    await syncUserGamification(user._id.toString());
    const updatedUser = await User.findById(user._id);
    if (!updatedUser) {
      res.status(500).json({ error: 'Erro ao atualizar usuário.' });
      return;
    }

    const newAchievements = updatedUser.gamificacao.conquistas.filter((a) => !prevAchievements.has(a));
    const xpBreakdown = calculateWorkoutXpBreakdown(
      exercicios.length,
      Math.max(streakBefore, updatedUser.gamificacao.streak_atual),
      newAchievements,
    );
    const levelBefore = xpLevelFromTotal(updatedUser.gamificacao.nivel_xp);
    const dailyAwarded = awardDailyExerciseXp(updatedUser, xpBreakdown.total_diario);
    const extraAwarded = awardBonusXp(updatedUser, xpBreakdown.total_extra);
    xpBreakdown.aplicado_diario = dailyAwarded;
    xpBreakdown.aplicado_extra = extraAwarded;
    xpBreakdown.aplicado = dailyAwarded + extraAwarded;
    const xpAwarded = xpBreakdown.aplicado;
    const levelAfter = xpLevelFromTotal(updatedUser.gamificacao.nivel_xp);
    const levelUp =
      levelAfter > levelBefore
        ? { level_anterior: levelBefore, level_novo: levelAfter }
        : null;
    const abdoriaGanha = awardAbdoriaFromXpProgress(updatedUser);
    syncShopUnlocks(updatedUser);

    await WorkoutHistory.updateById(history._id, { xp_ganho: xpAwarded });
    await updatedUser.save();

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
    });
  } catch (error) {
    console.error('POST /api/workouts/complete error:', error);
    res.status(500).json({ error: 'Erro ao salvar treino.' });
  }
});
