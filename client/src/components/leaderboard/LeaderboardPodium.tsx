import { motion } from 'framer-motion';
import { Coins, Flame, Zap } from 'lucide-react';
import { LeaderboardUserAvatar } from '@/components/leaderboard/LeaderboardUserAvatar';
import {
  CURRENCY_NAME,
  weeklyLeaderboardReward,
  type LeaderboardEntry,
  type LeaderboardMetric,
  type LeaderboardPeriod,
} from '@/types';

const PODIUM_SLOTS = [
  { entryIndex: 1, medal: 'silver', height: 'h-28', avatarSize: 'md' },
  { entryIndex: 0, medal: 'gold', height: 'h-40', avatarSize: 'lg' },
  { entryIndex: 2, medal: 'bronze', height: 'h-24', avatarSize: 'md' },
] as const;

/** Valor de destaque do pódio — o número que decide a posição no ranking. */
function podiumMetricValue(entry: LeaderboardEntry, metric: LeaderboardMetric): string {
  if (metric === 'streak') return `${entry.week_value ?? entry.streak_atual}`;
  if (metric === 'moedas') return `${entry.week_value ?? entry.moedas}`;
  return `${entry.week_value ?? entry.nivel_xp}`;
}

function podiumMetricUnit(metric: LeaderboardMetric): string {
  if (metric === 'streak') return 'dias';
  if (metric === 'moedas') return CURRENCY_NAME;
  return 'XP';
}

function PodiumMetricIcon({ metric }: { metric: LeaderboardMetric }) {
  if (metric === 'streak') return <Flame size={14} aria-hidden />;
  if (metric === 'moedas') return <Coins size={14} aria-hidden />;
  return <Zap size={14} aria-hidden />;
}

export function LeaderboardPodium({
  top3,
  metric,
  period,
  onOpen,
}: {
  top3: LeaderboardEntry[];
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  /** Abre o perfil público do jogador ao tocar no slot. */
  onOpen?: (entry: LeaderboardEntry) => void;
}) {
  if (top3.length === 0) return null;

  return (
    <div className="game-podium">
      {PODIUM_SLOTS.map((slot, visualIdx) => {
        const entry = top3[slot.entryIndex];
        if (!entry) return null;

        return (
          <motion.div
            key={entry.user_id}
            id={entry.is_me ? 'my-rank-row' : undefined}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: visualIdx * 0.1 }}
            className={`game-podium__slot game-podium__slot--${slot.medal}${onOpen ? ' game-podium__slot--link' : ''}`}
            role={onOpen ? 'button' : undefined}
            tabIndex={onOpen ? 0 : undefined}
            onClick={onOpen ? () => onOpen(entry) : undefined}
            onKeyDown={
              onOpen
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpen(entry);
                    }
                  }
                : undefined
            }
          >
            <LeaderboardUserAvatar
              entry={entry}
              size={slot.avatarSize}
              className="game-podium__avatar"
            />
            <p className="game-podium__name">{entry.nome}</p>
            <p className={`game-podium__metric game-podium__metric--${slot.medal}`}>
              <PodiumMetricIcon metric={metric} />
              <span className="game-podium__metric-value">
                {podiumMetricValue(entry, metric)}
              </span>
              <span className="game-podium__metric-unit">{podiumMetricUnit(metric)}</span>
            </p>
            <div
              className={
                entry.is_me && entry.banner_equipado && entry.banner_equipado !== 'fundo_padrao'
                  ? `game-podium__bar game-podium__bar--skinned game-card-banner--${entry.banner_equipado.replace('fundo_', '')} ${slot.height}`
                  : `game-podium__bar game-podium__bar--${slot.medal} ${slot.height}`
              }
            >
              <span className="game-podium__rank">#{entry.rank}</span>
              {period === 'semanal' &&
                metric !== 'streak' &&
                weeklyLeaderboardReward(entry.rank) && (
                  <span className="game-podium__reward">
                    <Coins size={10} aria-hidden />+{weeklyLeaderboardReward(entry.rank)}
                  </span>
                )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
