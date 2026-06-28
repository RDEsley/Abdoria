import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Sun, TrendingUp, Zap } from 'lucide-react';
import { XpBar } from '@/components/ui/XpBar';
import { formatDailyXpCapBreakdown, type DashboardStats } from '@/types';

interface Props {
  stats: DashboardStats;
  level: number;
  xpInLevel: number;
  xpToNext: number;
  xpParaLevelUp: number;
  dailyXpHint: string;
  id?: string;
  showRulesLink?: boolean;
}

export function LevelXpSection({
  stats,
  level,
  xpInLevel,
  xpToNext,
  xpParaLevelUp,
  dailyXpHint,
  id,
  showRulesLink = false,
}: Props) {
  const levelPct = xpToNext > 0 ? Math.min(100, Math.round((xpInLevel / xpToNext) * 100)) : 100;
  const prevLevelRef = useRef(level);
  const [leveledUp, setLeveledUp] = useState(false);

  useEffect(() => {
    if (level > prevLevelRef.current) {
      setLeveledUp(true);
      const timer = window.setTimeout(() => setLeveledUp(false), 1500);
      prevLevelRef.current = level;
      return () => window.clearTimeout(timer);
    }
    prevLevelRef.current = level;
    return undefined;
  }, [level]);
  const capBreakdown = formatDailyXpCapBreakdown({
    base: stats.xp_diario_cap_base,
    bonus_nivel: stats.xp_diario_cap_bonus_nivel,
    bonus_bestiario: stats.xp_diario_cap_bonus_bestiario,
    total: stats.xp_diario_limite,
  });

  return (
    <section
      id={id}
      className="game-xp-section glass-card scroll-mt-28 overflow-hidden rounded-2xl md:scroll-mt-24"
    >
      <header className="game-xp-section__hero">
        <div
          className={`game-xp-section__ring${leveledUp ? ' game-xp-section__ring--up' : ''}`}
          style={{ '--level-pct': levelPct } as CSSProperties}
          aria-hidden
        >
          <div className="game-xp-section__level">
            <span className="game-xp-section__level-label">Nível</span>
            <span className="game-xp-section__level-num">{level}</span>
          </div>
        </div>

        <div className="game-xp-section__summary">
          <h3 className="game-xp-section__title">
            <Zap size={14} className="game-xp-section__title-icon" aria-hidden />
            Nível & XP
          </h3>
          <p className="game-xp-section__subtitle">
            <strong>nv. {level + 1}</strong> em <strong>{xpParaLevelUp} XP</strong>
          </p>
          <ul className="game-xp-section__chips" aria-label="Resumo de XP">
            <li className="game-xp-section__chip game-xp-section__chip--total">
              <span className="game-xp-section__chip-value">{stats.nivel_xp}</span>
              <span className="game-xp-section__chip-label">XP total</span>
            </li>
          </ul>
        </div>
      </header>

      <div className="game-xp-section__body">
        <article className="game-xp-section__panel game-xp-section__panel--level">
          <div className="game-xp-section__panel-head">
            <TrendingUp size={16} className="game-xp-section__panel-icon game-xp-section__panel-icon--level" aria-hidden />
            <div>
              <p className="game-xp-section__panel-title">Progresso do nível</p>
              <p className="game-xp-section__panel-desc">{xpInLevel} / {xpToNext} XP · {levelPct}%</p>
            </div>
          </div>
          <XpBar value={xpInLevel} max={xpToNext} showValues={false} />
        </article>

        <article className="game-xp-section__panel game-xp-section__panel--daily-full">
          <div className="game-xp-section__panel-head">
            <Sun size={16} className="game-xp-section__panel-icon game-xp-section__panel-icon--daily" aria-hidden />
            <div>
              <p className="game-xp-section__panel-title">XP diário</p>
              <p className="game-xp-section__panel-desc">Exercícios, streak e conquistas de hoje</p>
            </div>
          </div>
          <XpBar
            value={stats.xp_hoje}
            max={stats.xp_diario_limite}
            variant="daily"
            pulseWhenFull
            showValues={false}
          />
          <p className="game-xp-section__panel-foot">
            {stats.xp_hoje}/{stats.xp_diario_limite} XP hoje
          </p>
          <p className="game-xp-section__panel-hint game-xp-section__panel-hint--cap">
            Máx. permanente: {capBreakdown}
          </p>
          <p className="game-xp-section__panel-hint">{dailyXpHint}</p>
        </article>

        {showRulesLink && (
          <p className="game-xp-section__footnote">
            Streak, conquistas e treino compartilham o mesmo teto diário. Nível e Bestiário aumentam o máx. permanentemente.{' '}
            <Link to="/configuracoes#regras-xp" className="game-xp-section__link">
              Ver regras de XP
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
