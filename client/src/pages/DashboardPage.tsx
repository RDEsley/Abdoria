import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Play, Timer } from 'lucide-react';
import { LevelXpSection } from '@/components/gamification/LevelXpSection';
import { MuscleBarChart } from '@/components/dashboard/MuscleBarChart';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { WeekSummary } from '@/components/dashboard/WeekSummary';
import { WeeklyChronicle } from '@/components/dashboard/WeeklyChronicle';
import { AchievementsPreview } from '@/components/gamification/AchievementCard';
import { DailyShopPanel } from '@/components/shop/DailyShopPanel';
import { StreakFireCelebration } from '@/components/effects/StreakFireCelebration';
import { GameButton } from '@/components/ui/GameButton';
import { PageLoader } from '@/components/ui/PageLoader';
import { StatTile } from '@/components/ui/StatTile';
import { formatTrainingDuration } from '@/lib/utils';
import { useApp } from '@/hooks/useApp';
import {
  MUSCULO_LABELS,
  XP_DAILY_MIN_EXERCISES,
  XP_DAILY_PER_EXERCISE,
  dailyFullExercisesForCap,
  formatExerciseName,
  xpProgressFromTotal,
} from '@/types';
import { DASHBOARD_LEVEL_XP_SECTION_ID } from '@/lib/dashboard-scroll';

const ActivityCalendar = lazy(() =>
  import('@/components/dashboard/ActivityCalendar').then((m) => ({ default: m.ActivityCalendar })),
);
const ConsistencyHeatmap = lazy(() =>
  import('@/components/dashboard/ConsistencyHeatmap').then((m) => ({
    default: m.ConsistencyHeatmap,
  })),
);
const FollowSuggestions = lazy(() =>
  import('@/components/social/FollowSuggestions').then((m) => ({
    default: m.FollowSuggestions,
  })),
);

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export function DashboardPage() {
  const { stats, loading, refresh, loadRecommendations } = useApp();
  const [streakCelebrate, setStreakCelebrate] = useState(false);
  const prevStreak = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && stats) {
      void loadRecommendations();
    }
  }, [loading, stats, loadRecommendations]);

  useEffect(() => {
    if (!stats) return;
    if (prevStreak.current !== null && stats.streak_atual > prevStreak.current) {
      setStreakCelebrate(true);
      const t = window.setTimeout(() => setStreakCelebrate(false), 2200);
      return () => clearTimeout(t);
    }
    prevStreak.current = stats.streak_atual;
  }, [stats?.streak_atual, stats]);

  if (loading) {
    return <PageLoader />;
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm font-bold text-stone-500">
          Não foi possível carregar sua tela inicial.
        </p>
        <GameButton onClick={() => void refresh()}>Tentar novamente</GameButton>
      </div>
    );
  }

  const { level, xpInLevel, xpToNext } = xpProgressFromTotal(stats.nivel_xp);
  const xpParaLevelUp = Math.max(0, xpToNext - xpInLevel);
  const sugerido = stats.treino_sugerido;

  const dailyXpHint = `${XP_DAILY_PER_EXERCISE} XP por exercício · mín. ${XP_DAILY_MIN_EXERCISES} no treino · ${dailyFullExercisesForCap(stats.xp_diario_limite)} exercícios atingem o máx. diário`;
  const playLink = sugerido?.preset_id ? `/construtor?preset=${sugerido.preset_id}` : '/construtor';

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative flex flex-col gap-5"
    >
      {streakCelebrate && stats.streak_atual > 0 && (
        <StreakFireCelebration streak={stats.streak_atual} />
      )}

      <motion.div variants={item}>
        <DashboardHero
          stats={stats}
          level={level}
          xpInLevel={xpInLevel}
          xpToNext={xpToNext}
          xpParaLevelUp={xpParaLevelUp}
        />
      </motion.div>

      <motion.div
        variants={item}
        className={`game-quest-card ${stats.treino_hoje ? 'game-quest-card--done' : ''}`}
      >
        <span className="game-quest-card__badge">
          {stats.treino_hoje ? 'Concluída' : 'Missão diária'}
        </span>
        <p className="game-quest-card__status">
          {stats.treino_hoje ? 'Treino de hoje concluído.' : stats.proximo_treino}
        </p>
        {!stats.treino_hoje && sugerido && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-bold text-stone-600">
              Ciclo {sugerido.ciclo_id} · {sugerido.total_exercicios} exercícios
            </p>
            {sugerido.exercicios[0] && (
              <p className="text-xs font-extrabold text-stone-700">
                {formatExerciseName(sugerido.exercicios[0])}
                {sugerido.exercicios.length > 1 && (
                  <span className="ml-1 font-bold text-stone-400">
                    +{sugerido.exercicios.length - 1}
                  </span>
                )}
              </p>
            )}
          </div>
        )}
        {stats.alertas_recomendacao?.map((alerta) => (
          <p
            key={alerta.id}
            className="mt-2 rounded-lg border-2 border-amber-200 bg-amber-50 px-2 py-1.5 text-[0.65rem] font-bold text-amber-900"
          >
            <strong>{alerta.titulo}:</strong> {alerta.mensagem}
          </p>
        ))}
        {!stats.treino_hoje && !sugerido && (
          <p className="mt-2 text-xs font-bold text-stone-500">
            Escolha ou monte um treino na aba <strong>Missão</strong>.
          </p>
        )}
        {!stats.treino_hoje && (
          <Link to={playLink} className="mt-3 block">
            <GameButton className="flex w-full items-center justify-center gap-2">
              <Play size={14} /> Jogar
            </GameButton>
          </Link>
        )}
      </motion.div>

      <motion.div variants={item}>
        <WeekSummary />
      </motion.div>

      <motion.div variants={item}>
        <WeeklyChronicle />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        <StatTile
          icon={<Flame className="text-orange-500" size={22} />}
          title="Recorde"
          value={`${stats.streak_maior}d`}
          hint="Dias seguidos treinando"
        />
        <StatTile
          icon={<Timer className="text-sky-600" size={22} />}
          title="Tempo total"
          value={formatTrainingDuration(stats.total_segundos ?? stats.total_minutos * 60)}
          hint="Soma de todos os treinos"
        />
      </motion.div>

      <motion.div variants={item}>
        <LevelXpSection
          id={DASHBOARD_LEVEL_XP_SECTION_ID}
          stats={stats}
          level={level}
          xpInLevel={xpInLevel}
          xpToNext={xpToNext}
          xpParaLevelUp={xpParaLevelUp}
          dailyXpHint={dailyXpHint}
          hideHero
        />
      </motion.div>

      <motion.div variants={item}>
        <AchievementsPreview
          conquistas={stats.conquistas}
          unlockedCount={stats.conquistas.filter((c) => c.desbloqueada).length}
          total={stats.conquistas.length}
        />
      </motion.div>

      <motion.section variants={item} className="glass-card p-4">
        <h3 className="game-section-title">Mapa de campanha</h3>
        <Suspense fallback={<PageLoader />}>
          <ConsistencyHeatmap />
        </Suspense>
      </motion.section>

      <motion.section variants={item}>
        <Suspense fallback={null}>
          <FollowSuggestions />
        </Suspense>
      </motion.section>

      <motion.section variants={item} className="glass-card p-4">
        <h3 className="game-section-title">Mapa de treinos</h3>
        <Suspense fallback={<PageLoader />}>
          <ActivityCalendar />
        </Suspense>
        <Link to="/historico" className="game-link-btn mt-3 inline-flex">
          Ver histórico completo →
        </Link>
      </motion.section>

      <motion.section variants={item} className="glass-card p-4">
        <h3 className="game-section-title">Zonas da semana</h3>
        <p className="mb-4 text-xs font-bold leading-relaxed text-stone-500">
          Volume desta semana por região.
        </p>
        {stats.area_mais_treinada && (
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[0.65rem] font-extrabold text-emerald-800">
              + {MUSCULO_LABELS[stats.area_mais_treinada]}
            </span>
            {stats.area_menos_treinada && (
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[0.65rem] font-extrabold text-stone-600">
                − {MUSCULO_LABELS[stats.area_menos_treinada]}
              </span>
            )}
          </div>
        )}
        <MuscleBarChart muscles={stats.musculos_semana} />
      </motion.section>

      <motion.div variants={item}>
        <DailyShopPanel />
      </motion.div>
    </motion.div>
  );
}
