import { Dumbbell, Flame, Timer, Trophy } from 'lucide-react';
import { AchievementsPreview } from '@/components/gamification/AchievementCard';
import { LevelXpSection } from '@/components/gamification/LevelXpSection';
import { StatTile } from '@/components/ui/StatTile';
import { formatTrainingDuration } from '@/lib/utils';
import {
  XP_DAILY_MIN_EXERCISES,
  XP_DAILY_PER_EXERCISE,
  dailyFullExercisesForCap,
  xpProgressFromTotal,
  type DashboardStats,
} from '@/types';

interface Props {
  stats: DashboardStats;
}

export function ProfileProgressPanel({ stats }: Props) {
  const { level, xpInLevel, xpToNext } = xpProgressFromTotal(stats.nivel_xp);
  const xpParaLevelUp = Math.max(0, xpToNext - xpInLevel);
  const unlockedAchievements = stats.conquistas.filter((c) => c.desbloqueada).length;
  const dailyXpHint = `${XP_DAILY_PER_EXERCISE} XP/exercício · mín. ${XP_DAILY_MIN_EXERCISES} · ${dailyFullExercisesForCap(stats.xp_diario_limite)} exercícios atingem o máx. diário`;

  return (
    <div className="game-profile-progress flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          icon={<Dumbbell className="text-emerald-600" size={20} />}
          title="Exercícios"
          value={String(stats.total_exercicios)}
          hint="Total concluído na conta"
        />
        <StatTile
          icon={<Timer className="text-sky-600" size={20} />}
          title="Tempo"
          value={formatTrainingDuration(stats.total_segundos ?? stats.total_minutos * 60)}
          hint="Soma de todos os treinos"
        />
        <StatTile
          icon={<Flame className="text-orange-500" size={20} />}
          title="Streak"
          value={`${stats.streak_atual}d`}
          hint={`Recorde: ${stats.streak_maior} dias`}
        />
        <StatTile
          icon={<Trophy className="text-amber-600" size={20} />}
          title="Conquistas"
          value={`${unlockedAchievements}/${stats.conquistas.length}`}
          hint="Desbloqueadas no jogo"
        />
      </div>

      <LevelXpSection
        stats={stats}
        level={level}
        xpInLevel={xpInLevel}
        xpToNext={xpToNext}
        xpParaLevelUp={xpParaLevelUp}
        dailyXpHint={dailyXpHint}
        showRulesLink
      />

      <AchievementsPreview
        conquistas={stats.conquistas}
        unlockedCount={unlockedAchievements}
        total={stats.conquistas.length}
      />
    </div>
  );
}
