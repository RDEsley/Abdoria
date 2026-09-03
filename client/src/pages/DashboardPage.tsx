import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Timer } from 'lucide-react';
import { LevelXpSection } from '@/components/gamification/LevelXpSection';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { AchievementsPreview } from '@/components/gamification/AchievementCard';
import { RatingPrompt } from '@/components/dashboard/RatingPrompt';
import { SuggestionPrompt } from '@/components/dashboard/SuggestionPrompt';
import { NotificationOptInPrompt } from '@/components/dashboard/NotificationOptInPrompt';
import { StreakRecoveryPrompt } from '@/components/dashboard/StreakRecoveryPrompt';
import { GameButton } from '@/components/ui/GameButton';
import { PageLoader } from '@/components/ui/PageLoader';
import { StatTile } from '@/components/ui/StatTile';
import { formatTrainingDuration } from '@/lib/utils';
import { useApp } from '@/hooks/useApp';
import {
  XP_DAILY_MIN_EXERCISES,
  XP_DAILY_PER_EXERCISE,
  dailyFullExercisesForCap,
  xpProgressFromTotal,
} from '@/types';
import { DASHBOARD_LEVEL_XP_SECTION_ID } from '@/lib/dashboard-scroll';
import { getWeekStartSaoPaulo } from '@shared/utils/timezone';
import { getDaySnapshot, type DaySnapshot } from '@/lib/api/day';
import { DaySummary } from '@/features/home/DaySummary';
import { NextUp } from '@/features/home/NextUp';
import { InsightCard } from '@/features/home/InsightCard';
import { WeekStrip } from '@/features/home/WeekStrip';
import { MomentumBar } from '@/components/dashboard/MomentumBar';
import { QuestCard } from '@/components/quests/QuestCard';
import { HomeCelebrationHost } from '@/components/dashboard/HomeCelebrationHost';
import { WeekRetroCard } from '@/components/dashboard/WeekRetroCard';
import { useMidnightRefresh } from '@/context/MidnightRefreshContext';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const WEEK_RETRO_KEY = 'evolyn:week-retro-seen';

/** Chave de dismiss da retrospectiva = segunda-feira civil em SP. */
function weekRetroPeriod(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  return getWeekStartSaoPaulo(new Date(Date.UTC(y, m - 1, d, 15, 0, 0)));
}

export function DashboardPage() {
  const { stats, loading, refresh, loadRecommendations } = useApp();
  const [day, setDay] = useState<DaySnapshot | null>(null);
  const [retroDismissed, setRetroDismissed] = useState(false);

  useMidnightRefresh(() => {
    void refresh();
    void getDaySnapshot()
      .then(setDay)
      .catch(() => setDay(null));
  });

  useEffect(() => {
    if (!loading && stats) void loadRecommendations();
  }, [loading, stats, loadRecommendations]);

  useEffect(() => {
    void getDaySnapshot()
      .then(setDay)
      .catch(() => setDay(null));
  }, [stats?.sequencia_garantida_hoje, stats?.xp_hoje, stats?.treino_hoje]);

  if (loading) return <PageLoader />;

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
  const dailyXpHint = `${XP_DAILY_PER_EXERCISE} XP por exercício · mín. ${XP_DAILY_MIN_EXERCISES} no treino · ${dailyFullExercisesForCap(stats.xp_diario_limite)} exercícios atingem o máx. diário`;
  const diaAtivo = day?.dia_ativo_garantido ?? stats.sequencia_garantida_hoje ?? stats.treino_hoje;
  const showRetro =
    Boolean(day?.week_retro) &&
    !retroDismissed &&
    (typeof localStorage === 'undefined' || !day
      ? true
      : localStorage.getItem(WEEK_RETRO_KEY) !== weekRetroPeriod(day.day_key));

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative flex flex-col gap-5"
    >
      <HomeCelebrationHost />
      <StreakRecoveryPrompt />
      <RatingPrompt />
      <SuggestionPrompt />
      {stats.streak_atual < 3 && <NotificationOptInPrompt />}

      <motion.div variants={item}>
        <DashboardHero
          level={level}
          xpInLevel={xpInLevel}
          xpToNext={xpToNext}
          xpParaLevelUp={xpParaLevelUp}
        />
      </motion.div>

      <motion.div variants={item}>
        <DaySummary
          diaAtivo={Boolean(diaAtivo)}
          streak={stats.streak_atual}
          xpHoje={stats.xp_hoje}
        />
      </motion.div>

      {day?.momentum && (
        <motion.div variants={item}>
          <MomentumBar currentPeriod={day.momentum.current_period} periods={day.momentum.periods} />
        </motion.div>
      )}

      {showRetro && day?.week_retro && (
        <motion.div variants={item}>
          <WeekRetroCard
            retro={day.week_retro}
            onDismiss={() => {
              try {
                localStorage.setItem(WEEK_RETRO_KEY, weekRetroPeriod(day.day_key));
              } catch {
                /* ignore */
              }
              setRetroDismissed(true);
            }}
          />
        </motion.div>
      )}

      <motion.div variants={item}>
        <QuestCard compact />
      </motion.div>

      <motion.div variants={item}>
        <NextUp items={day?.next_up ?? []} />
      </motion.div>

      {day?.week && (
        <motion.div variants={item}>
          <WeekStrip week={day.week} />
        </motion.div>
      )}

      <motion.div variants={item} className="dashboard-quick-stats grid grid-cols-2 gap-3">
        <StatTile
          tone="streak"
          ambient="streak"
          icon={<Flame className="text-orange-500" size={22} />}
          title="Streak Evolyn"
          value={stats.streak_atual}
          hint={`Recorde ${stats.streak_maior}`}
        />
        <StatTile
          tone="xp"
          ambient="tempo"
          icon={<Timer className="text-sky-600" size={22} />}
          title="Tempo de treino essa semana"
          value={
            (stats.segundos_semana ?? 0) > 0
              ? formatTrainingDuration(stats.segundos_semana ?? 0)
              : '—'
          }
          hint={(stats.segundos_semana ?? 0) > 0 ? 'Só sessões de treino' : 'Nenhum treino ainda'}
        />
      </motion.div>

      <motion.div variants={item}>
        <InsightCard insight={day?.insight ?? null} />
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
    </motion.div>
  );
}
