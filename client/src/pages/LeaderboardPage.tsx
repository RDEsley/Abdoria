import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { getLeaderboard, getMyLeaderboardRank } from '@/lib/api';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import type { LeaderboardEntry } from '@/types';

const PODIUM_HEIGHTS = ['h-28', 'h-36', 'h-24'] as const;
const PODIUM_ORDER = [1, 0, 2] as const;
const PODIUM_STYLES = ['game-podium__bar--silver', 'game-podium__bar--gold', 'game-podium__bar--bronze'] as const;

export function LeaderboardPage() {
  const [metric, setMetric] = useState<'xp' | 'streak'>('xp');
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
      .finally(() => setLoading(false));
  }, [metric]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="flex flex-col gap-5">
      <GamePageHeader eyebrow="PvE Global" title="Arena" />

      <div className="flex gap-2">
        {(['xp', 'streak'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            className={`game-tab${metric === m ? ' game-tab--active' : ''}`}
          >
            {m === 'xp' ? 'XP' : 'STREAK'}
          </button>
        ))}
      </div>

      {me && (
        <div className="game-rank-row game-rank-row--me">
          <span>Você · #{me.rank}</span>
          <span>{metric === 'xp' ? `${me.nivel_xp} XP` : `${me.streak_atual} dias`}</span>
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : (
        <>
          <div className="game-podium">
            {PODIUM_ORDER.map((idx, visualIdx) => {
              const e = top3[idx];
              if (!e) return null;
              return (
                <motion.div
                  key={e.user_id}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: visualIdx * 0.1 }}
                  className={`game-podium__slot ${idx === 0 ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'}`}
                >
                  <div className={`game-podium__bar ${PODIUM_STYLES[idx]} ${PODIUM_HEIGHTS[idx]} flex justify-center`}>
                    <span className="game-podium__rank">#{e.rank}</span>
                  </div>
                  <p className="mt-2 max-w-full truncate text-center text-xs font-extrabold text-stone-800">{e.nome}</p>
                  <p className="text-[10px] font-bold text-stone-500">
                    {metric === 'xp' ? `Nv.${e.level}` : `${e.streak_atual}d`}
                  </p>
                </motion.div>
              );
            })}
          </div>

          <ul className="flex flex-col gap-2">
            {rest.map((e) => (
              <li
                key={e.user_id}
                className={`game-rank-row${e.is_me ? ' game-rank-row--me' : ''}`}
              >
                <span className="font-mono text-stone-500">#{e.rank}</span>
                <span className="flex-1 px-3 text-stone-900">{e.nome}</span>
                <span className="text-emerald-700">
                  {metric === 'xp' ? `${e.nivel_xp} XP` : `${e.streak_atual}d`}
                </span>
              </li>
            ))}
          </ul>

          {entries.length === 0 && (
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
