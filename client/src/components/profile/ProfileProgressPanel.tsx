import { Link } from 'react-router-dom';
import { Dumbbell, Flame, Timer, Trophy, Zap } from 'lucide-react';
import { MuscleBarChart } from '@/components/dashboard/MuscleBarChart';
import { StreakBadge } from '@/components/gamification/StreakBadge';
import { XpBar } from '@/components/ui/XpBar';
import { formatTrainingDuration } from '@/lib/utils';
import {
  MUSCULO_LABELS,
  XP_DAILY_CAP_PER_LEVEL,
  XP_DAILY_MIN_EXERCISES,
  XP_DAILY_PER_EXERCISE,
  dailyFullExercisesForCap,
  spendableXpForShop,
  xpProgressFromTotal,
  type DashboardStats,
  type IUserDocument,
} from '@/types';

interface Props {
  profile: IUserDocument;
  stats: DashboardStats;
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

export function ProfileProgressPanel({ profile, stats }: Props) {
  const { level, xpInLevel, xpToNext } = xpProgressFromTotal(stats.nivel_xp);
  const xpParaLevelUp = Math.max(0, xpToNext - xpInLevel);
  const xpDisponivelTrocas = spendableXpForShop(stats.nivel_xp);
  const unlockedAchievements = stats.conquistas.filter((c) => c.desbloqueada).length;
  const dailyXpHint = `${XP_DAILY_PER_EXERCISE} XP/exercício · mín. ${XP_DAILY_MIN_EXERCISES} · teto ${stats.xp_diario_limite}/dia (+${XP_DAILY_CAP_PER_LEVEL}/nível) · ${dailyFullExercisesForCap(stats.xp_diario_limite)} exercícios enchem o teto`;

  return (
    <div className="game-profile-progress flex flex-col gap-4">
      <section className="game-profile-progress__hero glass-card rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="game-level-badge shrink-0">{level}</div>
            <div>
              <p className="game-profile-progress__name">{profile.nome}</p>
              <p className="text-xs font-bold text-stone-500">
                {stats.nivel_xp} XP total · nível {level}
              </p>
            </div>
          </div>
          <StreakBadge streak={stats.streak_atual} />
        </div>
        <p className="mt-3 text-[0.65rem] font-bold leading-relaxed text-stone-500">
          Faltam <strong className="text-emerald-700">{xpParaLevelUp} XP</strong> para o nível {level + 1}.
          {' '}
          <span className="text-amber-700">{xpDisponivelTrocas} XP</span> disponíveis para trocas hoje.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Dumbbell className="text-emerald-600" size={20} />}
          title="Exercícios"
          value={String(stats.total_exercicios)}
          hint="Total concluído na conta"
        />
        <StatCard
          icon={<Timer className="text-sky-600" size={20} />}
          title="Tempo"
          value={formatTrainingDuration(stats.total_segundos ?? stats.total_minutos * 60)}
          hint="Soma de todos os treinos"
        />
        <StatCard
          icon={<Flame className="text-orange-500" size={20} />}
          title="Streak"
          value={`${stats.streak_atual}d`}
          hint={`Recorde: ${stats.streak_maior} dias`}
        />
        <StatCard
          icon={<Trophy className="text-amber-600" size={20} />}
          title="Conquistas"
          value={`${unlockedAchievements}/${stats.conquistas.length}`}
          hint="Desbloqueadas no jogo"
        />
      </div>

      <section className="glass-card rounded-2xl p-4">
        <h3 className="game-section-title flex items-center gap-2">
          <Zap size={14} className="text-amber-500" /> Nível & XP
        </h3>
        <div className="mt-3 flex flex-col gap-3">
          <XpBar value={xpInLevel} max={xpToNext} label="Progresso do nível" />
          <XpBar
            value={stats.xp_hoje}
            max={stats.xp_diario_limite}
            label="XP diário (exercícios)"
            hint={dailyXpHint}
            variant="daily"
            pulseWhenFull
          />
          <XpBar
            value={stats.xp_extra_hoje}
            max={Math.max(stats.xp_extra_hoje, 1)}
            label="XP extra hoje"
            hint="Streak, conquistas, loja e habilidades — não conta no teto diário"
            variant="extra"
            valueOnly
          />
        </div>
        <p className="mt-3 text-[0.62rem] font-bold leading-relaxed text-stone-500">
          Bônus de streak, conquistas e loja não entram no teto diário de exercícios.{' '}
          <Link to="/configuracoes#regras-xp" className="text-emerald-700 underline">
            Ver regras de XP
          </Link>
        </p>
      </section>

      <section className="glass-card rounded-2xl p-4">
        <h3 className="game-section-title">Zonas da semana</h3>
        <p className="mb-3 text-[0.65rem] font-bold leading-relaxed text-stone-500">
          Volume desta semana por região do abdômen.
        </p>
        {stats.area_mais_treinada && (
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="game-profile-progress__zone-chip game-profile-progress__zone-chip--plus">
              + {MUSCULO_LABELS[stats.area_mais_treinada]}
            </span>
            {stats.area_menos_treinada && (
              <span className="game-profile-progress__zone-chip game-profile-progress__zone-chip--minus">
                − {MUSCULO_LABELS[stats.area_menos_treinada]}
              </span>
            )}
          </div>
        )}
        <MuscleBarChart muscles={stats.musculos_semana} monthly={stats.evolucao_mensal} />
      </section>
    </div>
  );
}
