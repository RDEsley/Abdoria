import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, Trophy } from 'lucide-react';
import { AchievementCard } from '@/components/gamification/AchievementCard';
import { sortAchievements } from '@/lib/achievements';
import { GameButton } from '@/components/ui/GameButton';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { useApp } from '@/hooks/useApp';
import { useCopy } from '@/hooks/useCopy';

export function AchievementsPage() {
  const navigate = useNavigate();
  const copy = useCopy();
  const { stats, loading, refresh } = useApp();
  const reduceMotion = Boolean(useReducedMotion());

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
  const progress = sorted.length > 0 ? Math.round((unlockedCount / sorted.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <GamePageHeader
        eyebrow={copy('conquistas_eyebrow')}
        title={copy('conquistas_title')}
        onBack={() => navigate(-1)}
        backIcon="x"
        backAlign="right"
      />

      <div className="game-quest-card achievements-hero">
        <div className="game-achievements-trophy" aria-hidden>
          <Trophy
            size={26}
            className="game-achievements-trophy__icon"
            fill="currentColor"
            fillOpacity={0.25}
          />
        </div>
        <div className="achievements-hero__copy">
          <p className="text-sm font-extrabold text-stone-800">
            {unlockedCount} de {sorted.length} desbloqueadas
          </p>
          <p className="text-xs font-bold text-stone-500">{copy('conquistas_subtitle')}</p>
          <div
            className="achievements-hero__progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={sorted.length}
            aria-valuenow={unlockedCount}
            aria-label="Progresso da coleção de conquistas"
          >
            <motion.span
              initial={reduceMotion ? false : { width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
        <strong className="achievements-hero__percentage">{progress}%</strong>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card achievements-collection"
      >
        <div className="achievements-collection__heading">
          <div>
            <p>Galeria Evolyn</p>
            <h2>Seus marcos de jornada</h2>
          </div>
          <Sparkles size={20} aria-hidden />
        </div>
        <div className="achievements-collection__list">
          {sorted.map((c, index) => (
            <AchievementCard key={c.id} achievement={c} index={index} />
          ))}
        </div>
      </motion.section>
    </div>
  );
}
