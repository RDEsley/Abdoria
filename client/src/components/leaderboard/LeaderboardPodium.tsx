import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';
import { LeaderboardUserAvatar } from '@/components/leaderboard/LeaderboardUserAvatar';
import {
  CURRENCY_NAME,
  weeklyLeaderboardReward,
  type LeaderboardEntry,
  type LeaderboardMetric,
} from '@/types';

const PODIUM_SLOTS = [
  { entryIndex: 1, medal: 'silver', height: 'h-28' },
  { entryIndex: 0, medal: 'gold', height: 'h-36' },
  { entryIndex: 2, medal: 'bronze', height: 'h-24' },
] as const;

function formatPodiumDetail(entry: LeaderboardEntry, metric: LeaderboardMetric): string {
  if (metric === 'xp') return `Nv.${entry.level}`;
  if (metric === 'streak') return `${entry.streak_atual}d`;
  return `${entry.week_value ?? entry.moedas} ${CURRENCY_NAME}`;
}

export function LeaderboardPodium({
  top3,
  metric,
}: {
  top3: LeaderboardEntry[];
  metric: LeaderboardMetric;
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
            className={`game-podium__slot game-podium__slot--${slot.medal}`}
          >
            <LeaderboardUserAvatar entry={entry} size="md" className="game-podium__avatar" />
            <p className="game-podium__name">{entry.nome}</p>
            <div className={`game-podium__bar game-podium__bar--${slot.medal} ${slot.height}`}>
              <span className="game-podium__rank">#{entry.rank}</span>
              {metric !== 'streak' && weeklyLeaderboardReward(entry.rank) && (
                <span className="game-podium__reward">
                  <Coins size={10} aria-hidden />+{weeklyLeaderboardReward(entry.rank)}
                </span>
              )}
            </div>
            <p className="game-podium__detail">
              {metric === 'moedas' && <Coins size={10} aria-hidden className="inline" />}
              {formatPodiumDetail(entry, metric)}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
