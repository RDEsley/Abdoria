import { useState } from 'react';
import { Dumbbell, Flame, Timer, Trophy } from 'lucide-react';
import { STREAK_RECORD_MATCH_COST } from '@shared/streak/recovery';
import { AchievementsPreview } from '@/components/gamification/AchievementCard';
import { LevelXpSection } from '@/components/gamification/LevelXpSection';
import { StatTile } from '@/components/ui/StatTile';
import { PurchaseConfirmDialog } from '@/components/shop/PurchaseConfirmDialog';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import { matchStreakRecord } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { formatTrainingDuration } from '@/lib/utils';
import {
  CURRENCY_NAME,
  XP_DAILY_MIN_EXERCISES,
  XP_DAILY_PER_EXERCISE,
  dailyFullExercisesForCap,
  resolveCosmeticos,
  xpProgressFromTotal,
  type DashboardStats,
} from '@/types';

interface Props {
  stats: DashboardStats;
}

export function ProfileProgressPanel({ stats }: Props) {
  const { user, applyUser } = useAuth();
  const { refresh } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { level, xpInLevel, xpToNext } = xpProgressFromTotal(stats.nivel_xp);
  const xpParaLevelUp = Math.max(0, xpToNext - xpInLevel);
  const unlockedAchievements = stats.conquistas.filter((c) => c.desbloqueada).length;
  const achievementsPct =
    stats.conquistas.length > 0
      ? Math.round((unlockedAchievements / stats.conquistas.length) * 100)
      : 0;
  const dailyXpHint = `${XP_DAILY_PER_EXERCISE} XP/exercício · mín. ${XP_DAILY_MIN_EXERCISES} · ${dailyFullExercisesForCap(stats.xp_diario_limite)} exercícios atingem o máx. diário`;

  const podeIgualarRecorde = stats.streak_atual < stats.streak_maior;
  const saldo = user ? resolveCosmeticos(user.cosmeticos, user.gamificacao.nivel_xp).moedas : 0;

  const confirmarIgualarRecorde = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await matchStreakRecord();
      applyUser(res.user);
      showGameToast(`Sequência igualada ao recorde: ${res.streak_atual} dias!`, {
        variant: 'success',
      });
      setConfirmOpen(false);
      void refresh();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível igualar a sequência.'), {
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

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
          hint="Só sessões de treino"
        />
        <StatTile
          icon={<Flame className="text-orange-500" size={20} />}
          title="Streak Evolyn"
          value={`${stats.streak_atual}d`}
          hint={
            podeIgualarRecorde
              ? `Recorde: ${stats.streak_maior} dias · toque para igualar`
              : `Recorde: ${stats.streak_maior} dias`
          }
          onClick={podeIgualarRecorde ? () => setConfirmOpen(true) : undefined}
        />
        <StatTile
          icon={<Timer className="text-emerald-700" size={20} />}
          title="Dias ativos"
          value={String(stats.dias_ativos_30 ?? '—')}
          hint="Últimos 30 dias"
        />
        <StatTile
          icon={
            <Trophy className="text-amber-600" size={20} fill="currentColor" fillOpacity={0.18} />
          }
          title="Conquistas"
          value={`${unlockedAchievements}/${stats.conquistas.length}`}
          hint={
            unlockedAchievements > 0
              ? `${achievementsPct}% da jornada conquistada`
              : 'Sua jornada de herói começa agora'
          }
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

      <PurchaseConfirmDialog
        open={confirmOpen}
        busy={busy}
        details={{
          itemName: 'Igualar sequência ao recorde',
          itemDescription: `Pula direto de ${stats.streak_atual} para ${stats.streak_maior} dias de streak.`,
          priceLabel: `${STREAK_RECORD_MATCH_COST} ${CURRENCY_NAME}`,
          balanceHint: `Saldo atual: ${saldo} ${CURRENCY_NAME}`,
        }}
        onConfirm={() => void confirmarIgualarRecorde()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
