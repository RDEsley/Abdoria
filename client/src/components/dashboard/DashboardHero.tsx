import type { CSSProperties } from 'react';
import { AnimatedTitleText } from '@/components/ui/AnimatedTitleText';
import { XpBar } from '@/components/ui/XpBar';
import { StreakBadge } from '@/components/gamification/StreakBadge';
import { StreakCountdown } from '@/components/gamification/StreakCountdown';
import { useAuth } from '@/context/AuthContext';
import { resolveEquippedTitle } from '@/lib/cosmetic-title';
import { scrollToDashboardLevelXp } from '@/lib/dashboard-scroll';
import { resolveCosmeticos, type DashboardStats } from '@/types';

interface Props {
  stats: DashboardStats;
  level: number;
  xpInLevel: number;
  xpToNext: number;
  xpParaLevelUp: number;
}

/**
 * Cabeçalho do painel no padrão "atleta primeiro": anel de nível, nome,
 * progresso de XP e streak. Reusa as classes visuais de .game-xp-section
 * (incluindo a skin do fundo cosmético equipado).
 */
export function DashboardHero({ stats, level, xpInLevel, xpToNext, xpParaLevelUp }: Props) {
  const { user } = useAuth();
  const firstName = user?.nome?.split(' ')[0] ?? 'Atleta';
  const cosmeticos = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp);
  const resolvedTitle = resolveEquippedTitle(cosmeticos.titulo_equipado);
  const fundoKey = cosmeticos.banner_equipado.replace('fundo_', '');
  const heroClass =
    fundoKey === 'padrao'
      ? 'game-xp-section__hero'
      : fundoKey === 'praia'
        ? `game-xp-section__hero game-xp-section__hero--skinned-light game-card-banner--${fundoKey}`
        : `game-xp-section__hero game-xp-section__hero--skinned game-card-banner--${fundoKey}`;

  const levelPct = xpToNext > 0 ? Math.min(100, Math.round((xpInLevel / xpToNext) * 100)) : 100;

  return (
    <section className="game-xp-section glass-card overflow-hidden">
      <header className={`${heroClass} !border-b-0`}>
        <button
          type="button"
          className="game-xp-section__ring cursor-pointer"
          style={{ '--level-pct': levelPct } as CSSProperties}
          onClick={scrollToDashboardLevelXp}
          aria-label={`Nível ${level}, ${levelPct}% completo — ver detalhes de XP`}
        >
          <span className="game-xp-section__level">
            <span className="game-xp-section__level-label">Nível</span>
            <span className="game-xp-section__level-num">{level}</span>
            <span className="game-xp-section__level-pct">{levelPct}%</span>
          </span>
        </button>

        <div className="game-xp-section__summary min-w-0 flex-1">
          <div className="game-xp-section__name-row">
            <h2 className="game-xp-section__title">{firstName}</h2>
            <AnimatedTitleText title={resolvedTitle} className="game-xp-section__player-title" />
          </div>
          <p className="game-xp-section__subtitle">
            <strong>{xpInLevel}</strong> / {xpToNext} XP · faltam <strong>{xpParaLevelUp}</strong>{' '}
            para o nível {level + 1}
          </p>
          <div className="mt-2">
            <XpBar value={xpInLevel} max={xpToNext} showValues={false} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StreakBadge streak={stats.streak_atual} frozen={!!stats.streak_frozen_notice} />
            <StreakCountdown
              treinoHoje={stats.treino_hoje}
              streak={stats.streak_atual}
              frozenCount={stats.frozen_streak_count}
            />
          </div>
        </div>
      </header>
    </section>
  );
}
