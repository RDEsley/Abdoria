import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type MouseEvent,
  type CSSProperties,
} from 'react';
import { CalendarDays, CalendarRange, Gift, Sparkles, Sun } from 'lucide-react';
import { listQuests, claimQuest, type QuestStatus } from '@/lib/api/quests';
import { useAuth } from '@/hooks/useAuth';
import { useMidnightRefresh } from '@/context/MidnightRefreshContext';
import { successHaptic } from '@/lib/platform/native-runtime';
import { showGameToast } from '@/lib/game-toast';
import { emitXpEarned } from '@/lib/xp-orbs';
import { GameButton } from '@/components/ui/GameButton';

type QuestScope = QuestStatus['scope'];

const SCOPES: QuestScope[] = ['daily', 'weekly', 'monthly'];

const SCOPE_META: Record<
  QuestScope,
  {
    label: string;
    short: string;
    hint: string;
    Icon: typeof Sun;
  }
> = {
  daily: {
    label: 'Hoje',
    short: 'Dia',
    hint: '3 missões do dia · renovam à meia-noite',
    Icon: Sun,
  },
  weekly: {
    label: 'Esta semana',
    short: 'Semana',
    hint: 'Metas da semana · Seg → Dom',
    Icon: CalendarDays,
  },
  monthly: {
    label: 'Este mês',
    short: 'Mês',
    hint: 'Desafio do mês · recompensa maior',
    Icon: CalendarRange,
  },
};

function QuestRow({
  quest,
  claiming,
  onClaim,
}: {
  quest: QuestStatus;
  claiming: string | null;
  onClaim: (quest: QuestStatus, origin: HTMLElement | null) => void;
}) {
  const pct = Math.min(100, Math.round((quest.progress / quest.goal) * 100));
  const ready = quest.progress >= quest.goal && !quest.claimed;
  const monthly = quest.scope === 'monthly';

  return (
    <div
      className={`quest-card${quest.claimed ? ' quest-card--claimed' : ''}${monthly ? ' quest-card--monthly' : ''}${ready ? ' quest-card--ready' : ''}`}
    >
      <div className="quest-card__top">
        <div className="quest-card__copy">
          <p className="quest-card__title">{quest.title}</p>
          <p className="quest-card__desc">{quest.description}</p>
        </div>
        <span className="quest-card__xp">+{quest.xp} XP</span>
      </div>
      <div className="quest-card__bar" aria-hidden>
        <div className="quest-card__bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="quest-card__footer">
        <span className="quest-card__progress">
          {quest.progress}/{quest.goal}
        </span>
        {quest.claimed && <span className="quest-card__done">Coletada ✓</span>}
        {ready && (
          <GameButton
            size="sm"
            disabled={claiming === quest.id}
            onClick={(event: MouseEvent<HTMLButtonElement>) =>
              onClaim(quest, event.currentTarget)
            }
          >
            Coletar
          </GameButton>
        )}
      </div>
    </div>
  );
}

export function QuestCard({ compact }: { compact?: boolean }) {
  const { applyUser } = useAuth();
  const [quests, setQuests] = useState<QuestStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [activeScope, setActiveScope] = useState<QuestScope>('daily');
  const trackRef = useRef<HTMLDivElement>(null);
  const paneRefs = useRef<Partial<Record<QuestScope, HTMLElement | null>>>({});
  const scrollingRef = useRef(false);

  const reload = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    listQuests()
      .then((next) => {
        setQuests(next);
        setLoadError(false);
      })
      .catch(() => {
        setLoadError(true);
        setQuests([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
    const onChange = () => reload();
    window.addEventListener('evolyn:quests-changed', onChange);
    return () => window.removeEventListener('evolyn:quests-changed', onChange);
  }, [reload]);

  useMidnightRefresh(reload);

  const handleClaim = async (quest: QuestStatus, origin: HTMLElement | null) => {
    if (claiming) return;
    setClaiming(quest.id);
    try {
      const res = await claimQuest(quest.id);
      applyUser(res.user);
      if (res.xp_ganho > 0) emitXpEarned(res.xp_ganho, origin);
      void successHaptic();
      showGameToast(`+${res.xp_ganho} XP pela missão "${quest.title}"!`, { variant: 'success' });
      setQuests((prev) => prev.map((q) => (q.id === quest.id ? { ...q, claimed: true } : q)));
      window.dispatchEvent(new Event('evolyn:quests-changed'));
    } catch (err) {
      showGameToast(err instanceof Error ? err.message : 'Erro ao coletar.', { variant: 'error' });
    } finally {
      setClaiming(null);
    }
  };

  const groups = useMemo(() => {
    const byScope: Record<QuestScope, QuestStatus[]> = {
      daily: [],
      weekly: [],
      monthly: [],
    };
    for (const quest of quests) {
      byScope[quest.scope]?.push(quest);
    }
    return byScope;
  }, [quests]);

  const claimableByScope = useMemo(() => {
    const counts: Record<QuestScope, number> = { daily: 0, weekly: 0, monthly: 0 };
    for (const scope of SCOPES) {
      counts[scope] = groups[scope].filter((q) => !q.claimed && q.progress >= q.goal).length;
    }
    return counts;
  }, [groups]);

  const scrollToScope = useCallback((scope: QuestScope) => {
    const track = trackRef.current;
    const pane = paneRefs.current[scope];
    if (!track || !pane) return;
    scrollingRef.current = true;
    setActiveScope(scope);
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({
      left: pane.offsetLeft - track.offsetLeft,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
    window.setTimeout(
      () => {
        scrollingRef.current = false;
      },
      reduceMotion ? 50 : 420,
    );
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const panes = SCOPES.map((scope) => paneRefs.current[scope]).filter(
      (node): node is HTMLElement => Boolean(node),
    );
    if (panes.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const scope = visible?.target.getAttribute('data-scope') as QuestScope | null;
        if (scope && SCOPES.includes(scope)) setActiveScope(scope);
      },
      { root: track, threshold: [0.55, 0.7] },
    );

    for (const pane of panes) observer.observe(pane);
    return () => observer.disconnect();
  }, [quests.length, loading, loadError]);

  const claimable = quests.filter((q) => !q.claimed && q.progress >= q.goal);
  const unclaimed = quests.filter((q) => !q.claimed);
  const closestToComplete = unclaimed
    .filter((q) => q.progress < q.goal)
    .sort((a, b) => b.progress / b.goal - a.progress / a.goal)[0];

  if (compact) {
    if (loading || loadError) return null;
    const highlight = claimable[0] ?? closestToComplete;
    if (!highlight) return null;
    const ready = highlight.progress >= highlight.goal && !highlight.claimed;
    return (
      <div className="glass-card glass-card--xp flex items-center gap-3 p-3">
        <Sparkles className="shrink-0 text-cyan-500" size={20} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-stone-700">{highlight.title}</p>
          <p className="text-[0.65rem] font-bold text-stone-500">
            {highlight.progress}/{highlight.goal} · {highlight.xp} XP
          </p>
        </div>
        {ready && (
          <GameButton
            size="sm"
            disabled={claiming === highlight.id}
            onClick={(event) => void handleClaim(highlight, event.currentTarget)}
          >
            Coletar
          </GameButton>
        )}
        {!ready && (
          <span className="text-[0.62rem] font-extrabold uppercase tracking-wide text-stone-400">
            {SCOPE_META[highlight.scope].label}
          </span>
        )}
      </div>
    );
  }

  return (
    <section className="missions-board" aria-label="Missões" aria-busy={loading || undefined}>
      <header className="missions-board__header">
        <h3 className="game-section-title flex items-center gap-2">
          <Gift size={16} aria-hidden /> Missões
        </h3>
        <p className="missions-board__lede">Deslize para trocar o período — ou toque nos filtros.</p>
      </header>

      <div className="missions-board__tabs" role="tablist" aria-label="Período das missões">
        {SCOPES.map((scope) => {
          const meta = SCOPE_META[scope];
          const Icon = meta.Icon;
          const readyCount = claimableByScope[scope];
          const selected = activeScope === scope;
          return (
            <button
              key={scope}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={loading || loadError}
              className={`missions-board__tab missions-board__tab--${scope}${selected ? ' is-active' : ''}`}
              onClick={() => scrollToScope(scope)}
            >
              <Icon size={14} aria-hidden />
              <span>{meta.short}</span>
              {!loading && !loadError && readyCount > 0 ? (
                <span className="missions-board__tab-badge" aria-label={`${readyCount} prontas`}>
                  {readyCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {loadError ? (
        <div className="missions-board__error" role="alert">
          <p>Não foi possível carregar suas missões.</p>
          <GameButton size="sm" onClick={() => reload()}>
            Tentar novamente
          </GameButton>
        </div>
      ) : loading ? (
        <div className="missions-board__skeleton-pane" aria-hidden>
          <div className="missions-board__skeleton-line missions-board__skeleton-line--title" />
          <div className="missions-board__skeleton-line missions-board__skeleton-line--wide" />
          <div className="missions-board__skeleton-line missions-board__skeleton-line--mid" />
          <div className="missions-board__skeleton-line missions-board__skeleton-line--wide" />
        </div>
      ) : (
        <>
      <div
        ref={trackRef}
        className="missions-board__track"
        data-no-nav-swipe
        aria-roledescription="carrossel"
      >
        {SCOPES.map((scope) => {
          const meta = SCOPE_META[scope];
          const Icon = meta.Icon;
          const items = groups[scope];
          const claimedCount = items.filter((q) => q.claimed).length;
          const xpTotal = items.reduce((sum, q) => sum + q.xp, 0);
          return (
            <article
              key={scope}
              ref={(node) => {
                paneRefs.current[scope] = node;
              }}
              data-scope={scope}
              className={`missions-board__pane missions-board__pane--${scope}`}
              aria-label={meta.label}
              style={{ '--missions-count': items.length } as CSSProperties}
            >
              <div className="missions-board__pane-head">
                <span className="missions-board__pane-icon" aria-hidden>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="missions-board__pane-title">{meta.label}</p>
                  <p className="missions-board__pane-hint">{meta.hint}</p>
                </div>
                <div className="missions-board__pane-stats">
                  <strong>{claimedCount}/{items.length}</strong>
                  <small>até {xpTotal} XP</small>
                </div>
              </div>

              <div className="missions-board__pane-list">
                {items.length === 0 ? (
                  <p className="missions-board__empty">Nenhuma missão neste período.</p>
                ) : (
                  items.map((quest) => (
                    <QuestRow
                      key={quest.id}
                      quest={quest}
                      claiming={claiming}
                      onClaim={(q, origin) => void handleClaim(q, origin)}
                    />
                  ))
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="missions-board__dots" aria-hidden>
        {SCOPES.map((scope) => (
          <button
            key={scope}
            type="button"
            className={`missions-board__dot${activeScope === scope ? ' is-active' : ''}`}
            tabIndex={-1}
            onClick={() => scrollToScope(scope)}
          />
        ))}
      </div>
        </>
      )}
    </section>
  );
}
