import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import {
  AchievementCard,
  sortAchievements,
} from '@/components/gamification/AchievementCard';
import { GameButton } from '@/components/ui/GameButton';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { useApp } from '@/hooks/useApp';
import { ACHIEVEMENT_DIFFICULTY_LABELS, type AchievementDifficulty } from '@/types';

const DIFFICULTY_ORDER: AchievementDifficulty[] = ['facil', 'media', 'dificil', 'lendaria'];

export function AchievementsPage() {
  const { stats, loading, refresh } = useApp();

  if (loading) return <PageLoader />;

  if (!stats) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm font-bold text-stone-500">Não foi possível carregar suas conquistas.</p>
        <GameButton onClick={() => void refresh()}>Tentar novamente</GameButton>
        <Link to="/" className="text-xs font-bold text-emerald-700 hover:underline">
          ← Voltar à Base
        </Link>
      </div>
    );
  }

  const sorted = sortAchievements(stats.conquistas);
  const unlockedCount = sorted.filter((c) => c.desbloqueada).length;

  return (
    <div className="flex flex-col gap-5">
      <GamePageHeader eyebrow="Hall da fama" title="Conquistas">
        <Link to="/" className="text-xs font-bold text-emerald-700 hover:underline">
          ← Base
        </Link>
      </GamePageHeader>

      <div className="game-quest-card flex items-center gap-3">
        <div className="game-level-badge !h-12 !w-12">
          <Trophy size={22} className="mx-auto text-amber-500" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-stone-800">
            {unlockedCount} de {sorted.length} desbloqueadas
          </p>
          <p className="text-xs font-bold text-stone-500">
            Percentuais estimados — dados reais em breve
          </p>
        </div>
      </div>

      {DIFFICULTY_ORDER.map((dificuldade) => {
        const group = sorted.filter((c) => c.dificuldade === dificuldade);
        if (group.length === 0) return null;

        return (
          <motion.section
            key={dificuldade}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4"
          >
            <h3 className={`game-section-title game-section-title--${dificuldade}`}>
              {ACHIEVEMENT_DIFFICULTY_LABELS[dificuldade]}
            </h3>
            <div className="flex flex-col gap-2">
              {group.map((c) => (
                <AchievementCard key={c.id} achievement={c} />
              ))}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
