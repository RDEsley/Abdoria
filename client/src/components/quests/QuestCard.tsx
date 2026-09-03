import { useState, useEffect, useCallback } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { listQuests, claimQuest, type QuestStatus } from '@/lib/api/quests';
import { useAuth } from '@/hooks/useAuth';
import { useMidnightRefresh } from '@/context/MidnightRefreshContext';
import { successHaptic } from '@/lib/platform/native-runtime';
import { showGameToast } from '@/lib/game-toast';
import { GameButton } from '@/components/ui/GameButton';

export function QuestCard({ compact }: { compact?: boolean }) {
  const { applyUser } = useAuth();
  const [quests, setQuests] = useState<QuestStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const reload = useCallback(() => {
    listQuests()
      .then(setQuests)
      .catch(() => setQuests([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
    const onChange = () => reload();
    window.addEventListener('evolyn:quests-changed', onChange);
    return () => window.removeEventListener('evolyn:quests-changed', onChange);
  }, [reload]);

  useMidnightRefresh(reload);

  const handleClaim = async (quest: QuestStatus) => {
    if (claiming) return;
    setClaiming(quest.id);
    try {
      const res = await claimQuest(quest.id);
      applyUser(res.user);
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

  if (loading || quests.length === 0) return null;

  const claimable = quests.filter((q) => !q.claimed && q.progress >= q.goal);
  const unclaimed = quests.filter((q) => !q.claimed);
  const closestToComplete = unclaimed
    .filter((q) => q.progress < q.goal)
    .sort((a, b) => b.progress / b.goal - a.progress / a.goal)[0];

  if (compact) {
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
            onClick={() => void handleClaim(highlight)}
          >
            Coletar
          </GameButton>
        )}
        {!ready && (
          <span className="text-xs font-bold text-stone-400">
            {unclaimed.length} missão{unclaimed.length !== 1 ? 'ões' : ''}
          </span>
        )}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="game-section-title flex items-center gap-2">
        <Gift size={16} /> Missões
      </h3>
      {quests.map((quest) => {
        const pct = Math.min(100, Math.round((quest.progress / quest.goal) * 100));
        const ready = quest.progress >= quest.goal && !quest.claimed;
        return (
          <div key={quest.id} className={`glass-card p-3 ${quest.claimed ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-extrabold text-stone-800">{quest.title}</p>
                <p className="text-xs font-semibold text-stone-500">{quest.description}</p>
              </div>
              <span className="shrink-0 text-xs font-extrabold text-cyan-700">{quest.xp} XP</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[0.65rem] font-bold text-stone-500">
              <span>
                {quest.progress}/{quest.goal}
              </span>
              {quest.claimed && <span className="text-emerald-600">Coletada ✓</span>}
              {ready && (
                <GameButton
                  size="sm"
                  disabled={claiming === quest.id}
                  onClick={() => void handleClaim(quest)}
                >
                  Coletar
                </GameButton>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
