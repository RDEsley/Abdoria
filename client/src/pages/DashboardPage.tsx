import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Play, Timer, Zap } from 'lucide-react';
import { MuscleBarChart } from '@/components/dashboard/MuscleBarChart';
import { AchievementsPreview } from '@/components/gamification/AchievementCard';
import { StreakBadge } from '@/components/gamification/StreakBadge';
import { GameButton } from '@/components/ui/GameButton';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { XpBar } from '@/components/ui/XpBar';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { MUSCULO_LABELS, formatExercisePrescription } from '@/types';

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
        {error ?? 'Não foi possível carregar o dashboard.'}
      </p>
    );
  }

  const xpProgress = stats.nivel_xp % 100;
  const level = Math.floor(stats.nivel_xp / 100) + 1;
  const sugerido = stats.treino_sugerido;
  const unlockedCount = stats.conquistas.filter((c) => c.desbloqueada).length;
  const playLink = sugerido?.preset_id ? `/construtor?preset=${sugerido.preset_id}` : '/construtor';

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-5">
      <motion.div variants={item}>
        <GamePageHeader eyebrow={`Bem-vindo, ${firstName}`} title="Sua Base de Treino" />
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
                {sugerido.primeiro_exercicio && (
                  <p className="text-xs font-extrabold text-stone-700">
                    Começa com: {sugerido.primeiro_exercicio}
                  </p>
                )}
                <ul className="mt-1 space-y-0.5">
                  {sugerido.exercicios.slice(0, 4).map((ex) => (
                    <li key={ex.slug} className="truncate text-[0.65rem] font-bold text-stone-500">
                      · {ex.nome} — {formatExercisePrescription(ex)}
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
                Escolha um treino no construtor para começar.
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
        <StatCard icon={<Flame className="text-orange-500" size={18} />} label="Recorde" value={`${stats.streak_maior}d`} />
        <StatCard icon={<Timer className="text-sky-600" size={18} />} label="Tempo" value={`${stats.total_minutos}m`} />
      </motion.div>

      <motion.section variants={item} className="glass-card p-4">
        <h3 className="game-section-title flex items-center gap-2">
          <Zap size={14} className="text-amber-500" /> Nível & XP
        </h3>
        <div className="flex items-center gap-4">
          <div className="game-level-badge">{level}</div>
          <div className="flex-1">
            <XpBar value={xpProgress} max={100} label="XP do nível" />
            <div className="mt-3">
              <XpBar
                value={stats.xp_hoje}
                max={stats.xp_diario_limite}
                label="XP hoje"
                variant="daily"
              />
            </div>
          </div>
        </div>
      </motion.section>

      <motion.div variants={item}>
        <AchievementsPreview
          conquistas={stats.conquistas}
          unlockedCount={unlockedCount}
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
    </motion.div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="game-stat">
      <div>{icon}</div>
      <p className="game-stat__label">{label}</p>
      <p className="game-stat__value">{value}</p>
    </div>
  );
}
