import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Eye, EyeOff, Globe, Leaf, Trophy } from 'lucide-react';
import { LeaderboardPodium } from '@/components/leaderboard/LeaderboardPodium';
import { LeaderboardResetCountdown } from '@/components/leaderboard/LeaderboardResetCountdown';
import { LeaderboardUserAvatar } from '@/components/leaderboard/LeaderboardUserAvatar';
import { getLeaderboard, getMyLeaderboardRank, updateMe } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import {
  CURRENCY_NAME,
  weeklyLeaderboardReward,
  type LeaderboardEntry,
  type LeaderboardMetric,
  type LeaderboardPeriod,
} from '@/types';

const METRICS: { id: LeaderboardMetric; label: string }[] = [
  { id: 'xp', label: 'Pontos (XP)' },
  { id: 'moedas', label: 'Folhas' },
  { id: 'streak', label: 'Dias seguidos' },
];

const PERIODS: { id: LeaderboardPeriod; label: string; icon: typeof Globe }[] = [
  { id: 'semanal', label: 'Semanal', icon: CalendarDays },
  { id: 'global', label: 'Global', icon: Globe },
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

function WeeklyRewardBadge({
  rank,
  metric,
  period,
}: {
  rank: number;
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
}) {
  // Recompensa de fechamento só existe no ciclo semanal.
  if (metric === 'streak' || period === 'global') return null;
  const reward = weeklyLeaderboardReward(rank);
  if (!reward) return null;

  return (
    <span className="game-rank-reward">
      <Leaf size={11} aria-hidden />+{reward}
    </span>
  );
}

function RankValue({ entry, metric }: { entry: LeaderboardEntry; metric: LeaderboardMetric }) {
  return (
    <span className="game-rank-row__value">
      {metric === 'moedas' && <Leaf size={14} aria-hidden />}
      {metric === 'xp'
        ? `${entry.week_value ?? entry.nivel_xp} XP`
        : metric === 'streak'
          ? `${entry.week_value ?? entry.streak_atual}d`
          : `${entry.week_value ?? entry.moedas} ${CURRENCY_NAME}`}
    </span>
  );
}

function RankRow({
  entry,
  metric,
  period,
  label,
  rankLabel,
  onOpen,
  pinned = false,
}: {
  entry: LeaderboardEntry;
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  label?: string;
  rankLabel?: string;
  onOpen?: () => void;
  pinned?: boolean;
}) {
  const skinned = entry.is_me && entry.banner_equipado && entry.banner_equipado !== 'fundo_padrao';
  const skinClass = skinned
    ? ` game-rank-row--skinned game-card-banner--${entry.banner_equipado.replace('fundo_', '')}`
    : '';

  return (
    <li
      id={entry.is_me && !pinned ? 'my-rank-row' : undefined}
      className={`game-rank-row${entry.is_me ? ' game-rank-row--me' : ''}${skinClass}${onOpen ? ' game-rank-row--link' : ''}`}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <span className="game-rank-row__rank">{rankLabel ?? `#${entry.rank}`}</span>
      <LeaderboardUserAvatar entry={entry} size="sm" />
      <div className="game-rank-row__main">
        <span className="game-rank-row__name">{label ?? entry.nome}</span>
        <WeeklyRewardBadge rank={entry.rank} metric={metric} period={period} />
      </div>
      <RankValue entry={entry} metric={metric} />
    </li>
  );
}

export function LeaderboardPage() {
  const navigate = useNavigate();
  const { user, applyUser } = useAuth();
  const [metric, setMetric] = useState<LeaderboardMetric>('xp');
  const [period, setPeriod] = useState<LeaderboardPeriod>('semanal');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRowVisible, setMyRowVisible] = useState(false);
  const [hasScrolledDown, setHasScrolledDown] = useState(false);
  const [visBusy, setVisBusy] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const listWrapRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin';
  const adminVisivel = user?.preferencias?.admin_visivel_ranking === true;

  // Dias seguidos também tem Global x Semanal: Semanal = sequência em
  // andamento, Global = recorde (streak_maior) — só não tem recompensa
  // semanal em coins (ver WeeklyRewardBadge), já que não existe acumulador
  // que reseta toda semana pra essa métrica.

  useEffect(() => {
    setLoading(true);
    void Promise.all([getLeaderboard(metric, period), getMyLeaderboardRank(metric, period)])
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
  }, [metric, period, reloadTick]);

  useEffect(() => {
    const updateScrollState = () => {
      setHasScrolledDown(window.scrollY > 24);
    };

    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollState);
  }, []);

  /** Só admins: alterna a própria visibilidade nos rankings (padrão: oculto). */
  const toggleAdminVisibilidade = async () => {
    if (!user || visBusy) return;
    setVisBusy(true);
    try {
      const updated = await updateMe({
        preferencias: { ...user.preferencias, admin_visivel_ranking: !adminVisivel },
      });
      applyUser(updated);
      setReloadTick((tick) => tick + 1);
      showGameToast(
        !adminVisivel ? 'Você agora aparece nos rankings.' : 'Você está oculto dos rankings.',
        { variant: 'info' },
      );
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível alterar a visibilidade.'), {
        variant: 'error',
      });
    } finally {
      setVisBusy(false);
    }
  };

  const meInPodium = entries.slice(0, 3).some((entry) => entry.is_me);
  const meInList = entries.slice(3).some((entry) => entry.is_me);
  const isMeInTop = me != null && (meInPodium || meInList);

  // A linha fixa embaixo só aparece enquanto a posição real do usuário está fora da tela.
  useEffect(() => {
    if (loading || !isMeInTop) {
      setMyRowVisible(false);
      return;
    }
    const target = meInList
      ? document.getElementById('my-rank-row')
      : document.getElementById('rank-podium');
    if (!target) {
      setMyRowVisible(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([observed]) => setMyRowVisible(observed?.isIntersecting ?? false),
      { threshold: meInList ? 0.6 : 0.3 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, isMeInTop, meInList, entries]);

  const scrollToMyRow = () => {
    const target = meInList
      ? document.getElementById('my-rank-row')
      : document.getElementById('rank-podium');
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const openProfile = (entry: LeaderboardEntry) => {
    navigate(entry.is_me ? '/perfil' : `/perfil/${entry.user_id}`);
  };

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const showPinnedMe = me != null && !loading && hasScrolledDown && (!isMeInTop || !myRowVisible);

  return (
    <div className="leaderboard-page flex flex-col gap-5">
      <GamePageHeader
        eyebrow="Comunidade Evolyn"
        title={period === 'global' ? 'Classificação Global' : 'Classificação Semanal'}
        onBack={() => navigate('/construtor')}
        backIcon="x"
        backAlign="right"
      >
        {isAdmin && (
          <button
            type="button"
            className="game-icon-btn shrink-0"
            disabled={visBusy}
            aria-pressed={adminVisivel}
            aria-label={
              adminVisivel ? 'Ocultar minha conta dos rankings' : 'Mostrar minha conta nos rankings'
            }
            title={
              adminVisivel
                ? 'Admin visível nos rankings — toque para ocultar'
                : 'Admin oculto dos rankings — toque para aparecer'
            }
            onClick={() => void toggleAdminVisibilidade()}
          >
            {adminVisivel ? <Eye size={18} aria-hidden /> : <EyeOff size={18} aria-hidden />}
          </button>
        )}
      </GamePageHeader>

      <div
        className="game-rank-period game-rank-period--split"
        role="radiogroup"
        aria-label="Período da classificação"
      >
        {PERIODS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={period === id}
            onClick={() => setPeriod(id)}
            className={`game-rank-period__btn${period === id ? ' game-rank-period__btn--active' : ''}`}
          >
            <Icon size={14} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {metric !== 'streak' && period === 'semanal' && <LeaderboardResetCountdown />}

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
                <Leaf size={14} aria-hidden />
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
        <div ref={listWrapRef} className="flex flex-col gap-5">
          <div id="rank-podium">
            <LeaderboardPodium top3={top3} metric={metric} period={period} onOpen={openProfile} />
          </div>

          {rest.length > 0 && (
            <ul className="game-rank-list">
              {rest.map((entry) => (
                <RankRow
                  key={entry.user_id}
                  entry={entry}
                  metric={metric}
                  period={period}
                  onOpen={() => openProfile(entry)}
                />
              ))}
            </ul>
          )}

          {entries.length === 0 && (
            <p className="text-center text-sm font-bold text-stone-500">
              <Trophy size={16} className="mr-1 inline" />
              Nenhum guerreiro no ranking ainda.
            </p>
          )}
        </div>
      )}

      <AnimatePresence>
        {showPinnedMe && me && (
          <motion.div
            className="game-rank-pinned"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <ul className="game-rank-list">
              <RankRow
                entry={me}
                metric={metric}
                period={period}
                label="Você"
                rankLabel={isMeInTop ? undefined : formatRankBand(me.rank, me.total)}
                onOpen={isMeInTop ? scrollToMyRow : undefined}
                pinned
              />
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
