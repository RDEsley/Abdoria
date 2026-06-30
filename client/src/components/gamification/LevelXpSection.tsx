import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, Flame, Sun, Zap } from 'lucide-react';
import { XpBar } from '@/components/ui/XpBar';
import { useAuth } from '@/context/AuthContext';
import { formatDailyXpCapBreakdown, resolveCosmeticos, type DashboardStats } from '@/types';

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
  const { user } = useAuth();
  const cosmeticos = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp);
  const fundoKey = cosmeticos.fundo_equipado.replace('fundo_', '');
  const heroClass =
    fundoKey === 'padrao'
      ? 'game-xp-section__hero'
      : fundoKey === 'praia'
        ? `game-xp-section__hero game-xp-section__hero--skinned-light game-card-fundo--${fundoKey}`
        : `game-xp-section__hero game-xp-section__hero--skinned game-card-fundo--${fundoKey}`;

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
    bonus_conquista: stats.xp_diario_cap_bonus_conquista,
    total: stats.xp_diario_limite,
  });

  const dailyPct = stats.xp_diario_limite > 0
    ? Math.min(100, Math.round((stats.xp_hoje / stats.xp_diario_limite) * 100))
    : 0;

  return (
    <section
      id={id}
      className="game-xp-section glass-card scroll-mt-28 overflow-hidden rounded-2xl md:scroll-mt-24"
    >
      <header className={heroClass}>
        <div
          className={`game-xp-section__ring${leveledUp ? ' game-xp-section__ring--up' : ''}`}
          style={{ '--level-pct': levelPct } as CSSProperties}
          aria-hidden
        >
          <div className="game-xp-section__level">
            <span className="game-xp-section__level-label">Nível</span>
            <span className="game-xp-section__level-num">{level}</span>
            <span className="game-xp-section__level-pct">{levelPct}%</span>
          </div>
        </div>

        <div className="game-xp-section__summary">
          <h3 className="game-xp-section__title">
            <Zap size={14} className="game-xp-section__title-icon" aria-hidden />
            Nível & XP
          </h3>
          <p className="game-xp-section__subtitle">
            Faltam <strong>{xpParaLevelUp} XP</strong> para o nível <strong>{level + 1}</strong>
          </p>
          <ul className="game-xp-section__chips" aria-label="Resumo de XP">
            <li className="game-xp-section__chip game-xp-section__chip--total">
              <span className="game-xp-section__chip-value">{stats.nivel_xp}</span>
              <span className="game-xp-section__chip-label">XP total</span>
            </li>
            <li className="game-xp-section__chip game-xp-section__chip--today">
              <span className="game-xp-section__chip-value">{stats.xp_hoje}</span>
              <span className="game-xp-section__chip-label">XP hoje</span>
            </li>
            <li className="game-xp-section__chip game-xp-section__chip--cap">
              <span className="game-xp-section__chip-value">{stats.xp_diario_limite}</span>
              <span className="game-xp-section__chip-label">Max. diário</span>
            </li>
          </ul>
        </div>
      </header>

      <div className="game-xp-section__body">
        {/* Progresso no nível atual */}
        <article className="game-xp-section__panel game-xp-section__panel--level">
          <div className="game-xp-section__panel-head">
            <BarChart2 size={16} className="game-xp-section__panel-icon game-xp-section__panel-icon--level" aria-hidden />
            <div>
              <p className="game-xp-section__panel-title">Progresso do nível</p>
              <p className="game-xp-section__panel-desc">
                {xpInLevel} / {xpToNext} XP · {levelPct}% completo
              </p>
            </div>
            <span className="game-xp-section__panel-badge">{levelPct}%</span>
          </div>
          <XpBar value={xpInLevel} max={xpToNext} showValues={false} />
          <p className="game-xp-section__panel-foot">
            Mais {xpParaLevelUp} XP para nível {level + 1}
          </p>
        </article>

        {/* XP diário */}
        <article className="game-xp-section__panel game-xp-section__panel--daily-full">
          <div className="game-xp-section__panel-head">
            <Sun size={16} className="game-xp-section__panel-icon game-xp-section__panel-icon--daily" aria-hidden />
            <div>
              <p className="game-xp-section__panel-title">XP de hoje</p>
              <p className="game-xp-section__panel-desc">
                {stats.xp_hoje} / {stats.xp_diario_limite} XP · {dailyPct}% do teto
              </p>
            </div>
            <span className={`game-xp-section__panel-badge${dailyPct >= 100 ? ' game-xp-section__panel-badge--full' : ''}`}>
              {dailyPct}%
            </span>
          </div>
          <XpBar
            value={stats.xp_hoje}
            max={stats.xp_diario_limite}
            variant="daily"
            pulseWhenFull
            showValues={false}
          />
          <p className="game-xp-section__panel-hint game-xp-section__panel-hint--cap">
            Teto: {capBreakdown}
          </p>
          {dailyXpHint && (
            <p className="game-xp-section__panel-hint">{dailyXpHint}</p>
          )}
        </article>

        {/* Dica de streak */}
        {stats.streak_atual > 0 && (
          <div className="game-xp-section__streak-row">
            <Flame size={13} className="game-xp-section__streak-icon" aria-hidden />
            <span>
              Streak de <strong>{stats.streak_atual} dia{stats.streak_atual !== 1 ? 's' : ''}</strong>
              {' '}· mantenha treinando todo dia para continuar ganhando XP bônus
            </span>
          </div>
        )}

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
