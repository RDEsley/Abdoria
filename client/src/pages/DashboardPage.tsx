import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Play, Timer } from 'lucide-react';
import { LevelXpSection } from '@/components/gamification/LevelXpSection';
import { MuscleBarChart } from '@/components/dashboard/MuscleBarChart';
import { AchievementsPreview } from '@/components/gamification/AchievementCard';
import { DailyShopPanel } from '@/components/shop/DailyShopPanel';
import { StreakBadge } from '@/components/gamification/StreakBadge';
import { StreakFireCelebration } from '@/components/effects/StreakFireCelebration';
import { GameButton } from '@/components/ui/GameButton';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { formatTrainingDuration } from '@/lib/utils';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { MUSCULO_LABELS, XP_DAILY_MIN_EXERCISES, XP_DAILY_PER_EXERCISE, dailyFullExercisesForCap, formatExerciseName, xpProgressFromTotal } from '@/types';
import { DASHBOARD_LEVEL_XP_SECTION_ID } from '@/lib/dashboard-scroll';

const ActivityCalendar = lazy(() =>
  import('@/components/dashboard/ActivityCalendar').then((m) => ({ default: m.ActivityCalendar })),
);

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export function DashboardPage() {
  const { stats, loading, refresh, loadRecommendations } = useApp();
  const { user } = useAuth();
  const firstName = user?.nome?.split(' ')[0] ?? 'Atleta';
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
        <p className="text-sm font-bold text-stone-500">Não foi possível carregar sua tela inicial.</p>
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
    <motion.div variants={container} initial="hidden" animate="show" className="relative flex flex-col gap-5">
      {streakCelebrate && stats.streak_atual > 0 && (
        <StreakFireCelebration streak={stats.streak_atual} />
      )}
      <motion.div variants={item}>
        <GamePageHeader eyebrow={`Bem-vindo, ${firstName}`} title="Seu painel de treinos" />
      </motion.div>

      <motion.div
        variants={item}
        className={`game-quest-card ${stats.treino_hoje ? 'game-quest-card--done' : ''}`}
      >
        <span className="game-quest-card__badge">
          {stats.treino_hoje ? 'CONCLUÍDA' : 'MISSÃO DIÁRIA'}
        </span>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="game-quest-card__status">
              {stats.treino_hoje ? 'Treino de hoje feito!' : stats.proximo_treino}
            </p>
            {!stats.treino_hoje && sugerido && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-bold text-emerald-700">
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
              <p key={alerta.id} className="mt-2 rounded-lg border-2 border-amber-200 bg-amber-50 px-2 py-1.5 text-[0.65rem] font-bold text-amber-900">
                <strong>{alerta.titulo}:</strong> {alerta.mensagem}
              </p>
            ))}
            {!stats.treino_hoje && !sugerido && (
              <p className="mt-2 text-xs font-bold text-stone-500">
                Toque em <strong>Missão</strong> (ícone de haltere) para escolher ou montar um treino.
              </p>
            )}
            <div className="mt-2">
              <StreakBadge streak={stats.streak_atual} frozen={!!stats.streak_frozen_notice} />
            </div>
          </div>
          {!stats.treino_hoje && (
            <Link to={playLink} className="shrink-0">
              <GameButton className="flex items-center justify-center gap-2">
                <Play size={14} /> JOGAR
              </GameButton>
            </Link>
          )}
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Flame className="text-orange-500" size={22} />}
          title="Streak"
          value={`${stats.streak_maior}d`}
          hint="Seu recorde de dias seguidos treinando"
        />
        <StatCard
          icon={<Timer className="text-sky-600" size={22} />}
          title="Tempo total"
          value={formatTrainingDuration(stats.total_segundos ?? stats.total_minutos * 60)}
          hint="Tempo real somado de todos os treinos"
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
        <h3 className="game-section-title">Mapa de treinos</h3>
        <Suspense fallback={<PageLoader />}>
          <ActivityCalendar />
        </Suspense>
      </motion.section>

      <motion.section variants={item} className="glass-card p-4">
        <h3 className="game-section-title">Zonas da semana</h3>
        <p className="mb-4 text-[0.65rem] font-bold leading-relaxed text-stone-500">
          Regiões do abdômen — volume desta semana por zona.
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

function StatCard({
  icon,
  title,
  value,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="game-stat">
      <div className="game-stat__head">
        {icon}
        <span className="game-stat__title">{title}</span>
      </div>
      <p className="game-stat__value">{value}</p>
      {hint && <p className="game-stat__hint">{hint}</p>}
    </div>
  );
}
