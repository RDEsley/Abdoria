import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Trophy } from 'lucide-react';
import { LeaderboardResetCountdown } from '@/components/leaderboard/LeaderboardResetCountdown';
import { LeaderboardUserAvatar } from '@/components/leaderboard/LeaderboardUserAvatar';
import { getLeaderboard, getMyLeaderboardRank } from '@/lib/api';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { CURRENCY_NAME, weeklyLeaderboardReward, type LeaderboardEntry, type LeaderboardMetric } from '@/types';

const PODIUM_SLOTS = [
  { entryIndex: 1, medal: 'silver', height: 'h-28' },
  { entryIndex: 0, medal: 'gold', height: 'h-36' },
  { entryIndex: 2, medal: 'bronze', height: 'h-24' },
] as const;

const METRICS: { id: LeaderboardMetric; label: string }[] = [
  { id: 'xp', label: 'Pontos (XP)' },
  { id: 'streak', label: 'Dias seguidos' },
  { id: 'moedas', label: CURRENCY_NAME },
];

function formatPodiumDetail(entry: LeaderboardEntry, metric: LeaderboardMetric): string {
  if (metric === 'xp') return `Nv.${entry.level}`;
  if (metric === 'streak') return `${entry.streak_atual}d`;
  return `${entry.moedas} ${CURRENCY_NAME}`;
}

function WeeklyRewardBadge({ rank }: { rank: number }) {
  const reward = weeklyLeaderboardReward(rank);
  if (!reward) return null;

  return (
    <span className="game-rank-reward">
      <Coins size={11} aria-hidden />
      +{reward}
    </span>
  );
}

function RankValue({ entry, metric }: { entry: LeaderboardEntry; metric: LeaderboardMetric }) {
  return (
    <span className="game-rank-row__value">
      {metric === 'moedas' && <Coins size={14} aria-hidden />}
      {metric === 'xp' ? `${entry.nivel_xp} XP` : metric === 'streak' ? `${entry.streak_atual}d` : `${entry.moedas} ${CURRENCY_NAME}`}
    </span>
  );
}

function RankRow({
  entry,
  metric,
  label,
}: {
  entry: LeaderboardEntry;
  metric: LeaderboardMetric;
  label?: string;
}) {
  return (
    <li className={`game-rank-row${entry.is_me ? ' game-rank-row--me' : ''}`}>
      <span className="game-rank-row__rank">#{entry.rank}</span>
      <LeaderboardUserAvatar entry={entry} size="sm" />
      <div className="game-rank-row__main">
        <span className="game-rank-row__name">{label ?? entry.nome}</span>
        <WeeklyRewardBadge rank={entry.rank} />
      </div>
      <RankValue entry={entry} metric={metric} />
    </li>
  );
}

export function LeaderboardPage() {
  const [metric, setMetric] = useState<LeaderboardMetric>('xp');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void Promise.all([getLeaderboard(metric), getMyLeaderboardRank(metric)])
      .then(([list, myRank]) => {
        setEntries(list);
        setMe(myRank);
      })
      .catch((err: unknown) => {
        setEntries([]);
        setMe(null);
        showGameToast(getErrorMessage(err, 'Não foi possível carregar o ranking.'), { variant: 'error' });
      })
      .finally(() => setLoading(false));
  }, [metric]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const isMeInTop = me != null && entries.some((entry) => entry.is_me);
  const showMeAtBottom = me != null && !isMeInTop;

  return (
    <div className="flex flex-col gap-5">
      <GamePageHeader eyebrow="Comunidade Abdoria" title="Classificação" />

      <LeaderboardResetCountdown />

      <div className="game-rank-tabs" role="tablist" aria-label="Critério de classificação">
        {METRICS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={metric === id}
            onClick={() => setMetric(id)}
            className={`game-tab${metric === id ? ' game-tab--active' : ''}`}
          >
            {id === 'moedas' ? (
              <span className="game-rank-tabs__label">
                <Coins size={14} aria-hidden />
                {label}
              </span>
            ) : (
              <span className="game-rank-tabs__label">{label}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <>
          {top3.length > 0 && (
            <div className="game-podium">
              {PODIUM_SLOTS.map((slot, visualIdx) => {
                const entry = top3[slot.entryIndex];
                if (!entry) return null;

                return (
                  <motion.div
                    key={entry.user_id}
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: visualIdx * 0.1 }}
                    className={`game-podium__slot game-podium__slot--${slot.medal}`}
                  >
                    <LeaderboardUserAvatar entry={entry} size="md" className="game-podium__avatar" />
                    <p className="game-podium__name">{entry.nome}</p>
                    <div className={`game-podium__bar game-podium__bar--${slot.medal} ${slot.height}`}>
                      <span className="game-podium__rank">#{entry.rank}</span>
                      {weeklyLeaderboardReward(entry.rank) && (
                        <span className="game-podium__reward">
                          <Coins size={10} aria-hidden />
                          +{weeklyLeaderboardReward(entry.rank)}
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
          )}

          {rest.length > 0 && (
            <ul className="game-rank-list">
              {rest.map((entry) => (
                <RankRow key={entry.user_id} entry={entry} metric={metric} />
              ))}
            </ul>
          )}

          {showMeAtBottom && me && (
            <>
              <p className="game-rank-list__divider">• • •</p>
              <ul className="game-rank-list">
                <RankRow entry={me} metric={metric} label="Você" />
              </ul>
            </>
          )}

          {entries.length === 0 && !showMeAtBottom && (
            <p className="text-center text-sm font-bold text-stone-500">
              <Trophy size={16} className="mr-1 inline" />
              Nenhum guerreiro no ranking ainda.
            </p>
          )}
        </>
      )}
    </div>
  );
}
