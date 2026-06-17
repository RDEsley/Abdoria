import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Play, Timer, Zap } from 'lucide-react';
import { MuscleBarChart } from '@/components/dashboard/MuscleBarChart';
import { AchievementsPreview } from '@/components/gamification/AchievementCard';
import { DailyShopPanel } from '@/components/shop/DailyShopPanel';
import { StreakBadge } from '@/components/gamification/StreakBadge';
import { GameButton } from '@/components/ui/GameButton';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { XpBar } from '@/components/ui/XpBar';
import { getErrorMessage } from '@/lib/api-errors';
import { formatTrainingDuration } from '@/lib/utils';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { MUSCULO_LABELS, XP_DAILY_CAP_PER_LEVEL, XP_DAILY_MIN_EXERCISES, XP_DAILY_PER_EXERCISE, dailyFullExercisesForCap, formatExerciseName, formatExercisePrescription, spendableXpForShop, xpProgressFromTotal } from '@/types';
import { DASHBOARD_LEVEL_XP_SECTION_ID } from '@/lib/dashboard-scroll';

const ActivityCalendar = lazy(() =>
  import('@/components/dashboard/ActivityCalendar').then((m) => ({ default: m.ActivityCalendar })),
);

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export function DashboardPage() {
  const { stats, loading, error } = useApp();
  const { user } = useAuth();
  const firstName = user?.nome?.split(' ')[0] ?? 'Atleta';

  if (loading) {
    return <PageLoader />;
  }

  if (!stats) {
    return (
      <p className="game-login__error">
        {getErrorMessage(error, 'Não foi possível carregar sua tela inicial.')}
      </p>
    );
  }

  const { level, xpInLevel, xpToNext } = xpProgressFromTotal(stats.nivel_xp);
  const xpParaLevelUp = Math.max(0, xpToNext - xpInLevel);
  const xpDisponivelTrocas = spendableXpForShop(stats.nivel_xp);
  const sugerido = stats.treino_sugerido;
  const dailyXpHint = `${XP_DAILY_PER_EXERCISE} XP por exercício · mín. ${XP_DAILY_MIN_EXERCISES} no treino · teto ${stats.xp_diario_limite} XP/dia (+${XP_DAILY_CAP_PER_LEVEL}/nível) · ${dailyFullExercisesForCap(stats.xp_diario_limite)} exercícios enchem o teto`;
  const playLink = sugerido?.preset_id ? `/construtor?preset=${sugerido.preset_id}` : '/construtor';

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-5">
      <motion.div variants={item}>
        <GamePageHeader eyebrow={`Bem-vindo, ${firstName}`} title="Seu painel de treinos" />
        {error && <p className="mt-2 game-login__error game-login__error--warn">{error}</p>}
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
              <div className="mt-2 space-y-1.5">
                <p className="text-xs font-bold text-emerald-700">
                  Ciclo {sugerido.ciclo_id} · {sugerido.total_exercicios} exercícios
                </p>
                {sugerido.exercicios[0] && (
                  <p className="text-xs font-extrabold text-stone-700">
                    Começa com: {formatExerciseName(sugerido.exercicios[0])}
                  </p>
                )}
                <ul className="mt-1 space-y-0.5">
                  {sugerido.exercicios.slice(0, 4).map((ex) => (
                    <li key={ex.slug} className="truncate text-[0.65rem] font-bold text-stone-500">
                      · {formatExerciseName(ex)} — {formatExercisePrescription(ex)}
                    </li>
                  ))}
                  {sugerido.exercicios.length > 4 && (
                    <li className="text-[0.65rem] font-bold text-stone-400">
                      + {sugerido.exercicios.length - 4} exercícios
                    </li>
                  )}
                </ul>
              </div>
            )}
            {!stats.treino_hoje && !sugerido && (
              <p className="mt-2 text-xs font-bold text-stone-500">
                Toque em <strong>Missão</strong> (ícone de haltere) para escolher ou montar um treino.
              </p>
            )}
            <div className="mt-2">
              <StreakBadge streak={stats.streak_atual} />
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

      <motion.section
        id={DASHBOARD_LEVEL_XP_SECTION_ID}
        variants={item}
        className="glass-card scroll-mt-28 p-4 md:scroll-mt-24"
      >
        <h3 className="game-section-title flex items-center gap-2">
          <Zap size={14} className="text-amber-500" /> Nível & XP
        </h3>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[0.65rem] font-bold text-stone-600">
          <span>{stats.nivel_xp} XP total</span>
          <span className="text-emerald-700">{xpDisponivelTrocas} XP para trocas hoje</span>
          <span>Faltam {xpParaLevelUp} XP para o nível {level + 1}</span>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <div className="game-level-badge">{level}</div>
          <div className="flex-1">
            <XpBar value={xpInLevel} max={xpToNext} label="Progresso do nível" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <XpBar
                value={stats.xp_hoje}
                max={stats.xp_diario_limite}
                label="XP diário"
                hint={dailyXpHint}
                variant="daily"
                pulseWhenFull
              />
              <XpBar
                value={stats.xp_extra_hoje}
                max={Math.max(stats.xp_extra_hoje, 1)}
                label="XP extra"
                hint="Streak, conquistas, loja e habilidades"
                variant="extra"
                valueOnly
              />
            </div>
          </div>
        </div>
      </motion.section>

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
        <p className="mb-3 text-[0.65rem] font-bold leading-relaxed text-stone-500">
          Regiões do abdômen — não são peito, costas ou pernas de musculação.
        </p>
        {stats.area_mais_treinada && (
          <p className="mb-3 text-xs font-bold text-stone-500">
            + {MUSCULO_LABELS[stats.area_mais_treinada]}
            {stats.area_menos_treinada && ` · − ${MUSCULO_LABELS[stats.area_menos_treinada]}`}
          </p>
        )}
        <MuscleBarChart muscles={stats.musculos_semana} monthly={stats.evolucao_mensal} />
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
