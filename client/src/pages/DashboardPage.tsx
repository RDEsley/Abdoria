import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Play, Timer } from 'lucide-react';
import { LevelXpSection } from '@/components/gamification/LevelXpSection';
import { MuscleBarChart } from '@/components/dashboard/MuscleBarChart';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { WeekSummary } from '@/components/dashboard/WeekSummary';
import { WeeklyChronicle } from '@/components/dashboard/WeeklyChronicle';
import { AchievementsPreview } from '@/components/gamification/AchievementCard';
import { RatingPrompt } from '@/components/dashboard/RatingPrompt';
import { SuggestionPrompt } from '@/components/dashboard/SuggestionPrompt';
import { NotificationOptInPrompt } from '@/components/dashboard/NotificationOptInPrompt';
import { StreakRecoveryPrompt } from '@/components/dashboard/StreakRecoveryPrompt';
import { GameButton } from '@/components/ui/GameButton';
import { PageLoader } from '@/components/ui/PageLoader';
import { StatTile } from '@/components/ui/StatTile';
import { formatTrainingDuration } from '@/lib/utils';
import { isRestDay } from '@shared/training-plan';
import { getSaoPauloWeekday } from '@shared/utils/timezone';
import { useApp } from '@/hooks/useApp';
import { useCopy } from '@/hooks/useCopy';
import {
  XP_DAILY_MIN_EXERCISES,
  XP_DAILY_PER_EXERCISE,
  dailyFullExercisesForCap,
  formatExerciseName,
  xpProgressFromTotal,
} from '@/types';
import { DASHBOARD_LEVEL_XP_SECTION_ID } from '@/lib/dashboard-scroll';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export function DashboardPage() {
  const { stats, loading, refresh, loadRecommendations, user } = useApp();
  const copy = useCopy();

  useEffect(() => {
    if (!loading && stats) {
      void loadRecommendations();
    }
  }, [loading, stats, loadRecommendations]);

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
  const playLink = sugerido?.preset_id ? `/treino?preset=${sugerido.preset_id}` : '/treino';

  const perfilTreino = user?.perfil_treino ?? null;
  const abProfile = user?.ab_training_profile_v2 ?? null;
  const hoje = getSaoPauloWeekday();
  // Streak 0 indica primeiro treino ou recomeço, portanto o app não sugere descanso.
  const diaDescanso =
    !stats.treino_hoje &&
    stats.streak_atual > 0 &&
    (abProfile ? !abProfile.training_days.includes(hoje) : isRestDay(perfilTreino, hoje));

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative flex flex-col gap-5"
    >
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

      <motion.div
        variants={item}
        className={`game-quest-card dashboard-treino ${stats.treino_hoje ? 'game-quest-card--done' : ''}`}
      >
        <span className="game-quest-card__badge">
          {stats.treino_hoje
            ? 'Concluído'
            : diaDescanso
              ? 'Dia de descanso'
              : copy('dashboard_treino_badge')}
        </span>
        <p className="game-quest-card__status">
          {stats.treino_hoje ? 'Treino de hoje concluído.' : stats.proximo_treino}
        </p>
        {!stats.treino_hoje && sugerido && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-bold text-stone-600">
              {sugerido.ciclo_id
                ? `Ciclo ${sugerido.ciclo_id}`
                : (sugerido.plano_titulo ?? 'Plano')}{' '}
              · {sugerido.total_exercicios} exercícios
            </p>
            {sugerido.exercicios[0] && (
              <p className="text-xs font-extrabold text-stone-700">
                {formatExerciseName(sugerido.exercicios[0])}
                {sugerido.exercicios.length > 1 && (
                  <>
                    {' '}
                    <Link to={playLink} className="game-link-btn ml-1 text-[0.7rem]">
                      +{sugerido.exercicios.length - 1} · Ver mais
                    </Link>
                  </>
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
            Escolha ou monte um treino na aba <strong>Treino</strong>.
          </p>
        )}
        {!stats.treino_hoje && (
          <Link to={playLink} className="mt-3 block">
            <GameButton className="flex w-full items-center justify-center gap-2">
              <Play size={14} /> Iniciar treino
            </GameButton>
          </Link>
        )}
        {!stats.treino_hoje && diaDescanso && (
          <p className="mt-2 text-[0.68rem] font-semibold leading-relaxed text-stone-500">
            Hoje é dia de descanso, mas você pode realizar uma{' '}
            <Link to="/atividades" className="font-extrabold text-emerald-700 underline">
              Atividade
            </Link>{' '}
            para manter seu Streak.
          </p>
        )}
      </motion.div>

      <motion.div variants={item}>
        <WeekSummary />
      </motion.div>

      <motion.div variants={item} className="dashboard-quick-stats grid grid-cols-2 gap-3">
        <StatTile
          icon={<Flame className="text-orange-500" size={22} />}
          title="Streak atual"
          value={`${stats.streak_atual}d`}
          hint={`Seu recorde é ${stats.streak_maior} dias`}
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

      <motion.section
        variants={item}
        className="glass-card dashboard-surface dashboard-surface--core p-4"
      >
        <h3 className="game-section-title !mb-1">Equilíbrio do core</h3>
        <p className="mb-3 text-xs font-semibold text-stone-500">
          Como seus treinos distribuíram os estímulos nesta semana.
        </p>
        <MuscleBarChart muscles={stats.musculos_semana} />
      </motion.section>

      <motion.div variants={item}>
        <WeeklyChronicle />
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
