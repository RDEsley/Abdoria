import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { AchievementCard, sortAchievements } from '@/components/gamification/AchievementCard';
import { GameButton } from '@/components/ui/GameButton';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { useApp } from '@/hooks/useApp';
import { useCopy } from '@/hooks/useCopy';

export function AchievementsPage() {
  const navigate = useNavigate();
  const copy = useCopy();
  const { stats, loading, refresh } = useApp();

  if (loading) return <PageLoader />;

  if (!stats) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm font-bold text-stone-500">
          Não foi possível carregar suas conquistas.
        </p>
        <GameButton onClick={() => void refresh()}>Tentar novamente</GameButton>
        <Link to="/" className="game-link-btn">
          ← Voltar à Base
        </Link>
      </div>
    );
  }

  const sorted = sortAchievements(stats.conquistas);
  const unlockedCount = sorted.filter((c) => c.desbloqueada).length;

  return (
    <div className="flex flex-col gap-5">
      <GamePageHeader
        eyebrow={copy('conquistas_eyebrow')}
        title={copy('conquistas_title')}
        onBack={() => navigate(-1)}
        backIcon="x"
        backAlign="right"
      />

      <div className="game-quest-card flex items-center gap-3">
        <div className="game-achievements-trophy" aria-hidden>
          <Trophy size={26} className="game-achievements-trophy__icon" fill="currentColor" fillOpacity={0.25} />
        </div>
        <div>
          <p className="text-sm font-extrabold text-stone-800">
            {unlockedCount} de {sorted.length} desbloqueadas
          </p>
          <p className="text-xs font-bold text-stone-500">{copy('conquistas_subtitle')}</p>
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4"
      >
        <div className="flex flex-col gap-2">
          {sorted.map((c) => (
            <AchievementCard key={c.id} achievement={c} />
          ))}
        </div>
      </motion.section>
    </div>
  );
}
