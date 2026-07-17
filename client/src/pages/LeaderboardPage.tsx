import { useEffect, useState } from 'react';
import { Coins, Locate, Trophy } from 'lucide-react';
import { LeaderboardPodium } from '@/components/leaderboard/LeaderboardPodium';
import { LeaderboardResetCountdown } from '@/components/leaderboard/LeaderboardResetCountdown';
import { LeaderboardUserAvatar } from '@/components/leaderboard/LeaderboardUserAvatar';
import { getLeaderboard, getMyLeaderboardRank } from '@/lib/api';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import {
  CURRENCY_NAME,
  weeklyLeaderboardReward,
  type LeaderboardEntry,
  type LeaderboardMetric,
} from '@/types';

const METRICS: { id: LeaderboardMetric; label: string }[] = [
  { id: 'xp', label: 'Pontos (XP)' },
  { id: 'moedas', label: CURRENCY_NAME },
  { id: 'streak', label: 'Dias seguidos' },
];

// Faixa aproximada pra quem está fora do top 25 — só entra em jogo se o total de
// participantes realmente justificar (senão "Top 250" com 40 usuários é ruído, não sinal).
const RANK_BANDS = [250, 500, 1000] as const;

function formatRankBand(rank: number, total: number | null | undefined): string | undefined {
  if (!total || rank <= 25) return undefined;
  for (const band of RANK_BANDS) {
    if (total > band && rank <= band) return `Top ${band}`;
  }
  return total > 1000 ? '1000+' : undefined;
}

function scrollToMyPosition() {
  document.getElementById('my-rank-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function WeeklyRewardBadge({ rank, metric }: { rank: number; metric: LeaderboardMetric }) {
  if (metric === 'streak') return null;
  const reward = weeklyLeaderboardReward(rank);
  if (!reward) return null;

  return (
    <span className="game-rank-reward">
      <Coins size={11} aria-hidden />+{reward}
    </span>
  );
}

function RankValue({ entry, metric }: { entry: LeaderboardEntry; metric: LeaderboardMetric }) {
  return (
    <span className="game-rank-row__value">
      {metric === 'moedas' && <Coins size={14} aria-hidden />}
      {metric === 'xp'
        ? `${entry.week_value ?? entry.nivel_xp} XP`
        : metric === 'streak'
          ? `${entry.streak_atual}d`
          : `${entry.week_value ?? entry.moedas} ${CURRENCY_NAME}`}
    </span>
  );
}

function RankRow({
  entry,
  metric,
  label,
  rankLabel,
}: {
  entry: LeaderboardEntry;
  metric: LeaderboardMetric;
  label?: string;
  rankLabel?: string;
}) {
  return (
    <li
      id={entry.is_me ? 'my-rank-row' : undefined}
      className={`game-rank-row${entry.is_me ? ' game-rank-row--me' : ''}`}
    >
      <span className="game-rank-row__rank">{rankLabel ?? `#${entry.rank}`}</span>
      <LeaderboardUserAvatar entry={entry} size="sm" />
      <div className="game-rank-row__main">
        <span className="game-rank-row__name">{label ?? entry.nome}</span>
        <WeeklyRewardBadge rank={entry.rank} metric={metric} />
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
        showGameToast(getErrorMessage(err, 'Não foi possível carregar o ranking.'), {
          variant: 'error',
        });
      })
      .finally(() => setLoading(false));
  }, [metric]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const isMeInTop = me != null && entries.some((entry) => entry.is_me);
  const showMeAtBottom = me != null && !isMeInTop;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <GamePageHeader eyebrow="Comunidade Abdoria" title="Classificação" />
        {me != null && (
          <button
            type="button"
            className="game-btn game-btn--ghost game-btn--sm shrink-0"
            onClick={scrollToMyPosition}
          >
            <Locate size={14} aria-hidden />
            Minha posição
          </button>
        )}
      </div>

      {metric !== 'streak' && <LeaderboardResetCountdown />}

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
          <LeaderboardPodium top3={top3} metric={metric} />

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
                <RankRow
                  entry={me}
                  metric={metric}
                  label="Você"
                  rankLabel={formatRankBand(me.rank, me.total)}
                />
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
