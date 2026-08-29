import { useEffect, useState, type CSSProperties } from 'react';
import { AnimatedTitleText } from '@/components/ui/AnimatedTitleText';
import { StreakBadge } from '@/components/gamification/StreakBadge';
import { StreakCountdown } from '@/components/gamification/StreakCountdown';
import { useAuth } from '@/context/AuthContext';
import { useCopy } from '@/hooks/useCopy';
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
  const copy = useCopy();
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
  const minimal = !(user?.preferencias?.confetti_animacoes_habilitadas ?? true);

  // O anel/barra enchem do zero até o valor real toda vez que a Home é
  // montada (o usuário entra na tela). Sem ref pra "já animou uma vez": um
  // guard desse tipo, mutado direto dentro do efeito, quebra sob o
  // StrictMode do React em dev — o efeito roda 2x (mount, cleanup, mount de
  // novo), o cleanup da 1ª rodada cancela o RAF antes dele disparar, e a 2ª
  // rodada já encontra o guard como "true" e pula a animação inteira, indo
  // direto pro valor final sem o usuário nunca ver o preenchimento. Cada
  // execução do efeito agora usa seu próprio `cancelled` local (fechado
  // nessa run específica), então a 2ª invocação do StrictMode sempre roda
  // sua própria animação limpa, sem interferência da 1ª.
  const [displayPct, setDisplayPct] = useState(minimal ? levelPct : 0);

  useEffect(() => {
    if (minimal) {
      setDisplayPct(levelPct);
      return undefined;
    }
    let cancelled = false;
    let raf = 0;
    setDisplayPct(0);
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayPct(levelPct * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [levelPct, minimal]);

  return (
    <section className="game-xp-section glass-card overflow-hidden">
      <header className={`${heroClass} !border-b-0`}>
        <button
          type="button"
          className="game-xp-section__ring cursor-pointer"
          style={{ '--level-pct': displayPct } as CSSProperties}
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
            <h2 className="game-xp-section__title min-w-0 truncate">{user?.nome ?? 'Atleta'}</h2>
            <AnimatedTitleText title={resolvedTitle} className="game-xp-section__player-title" />
          </div>
          <p className="game-xp-section__subtitle">
            <strong>{xpInLevel}</strong> / {xpToNext} {copy('xp_unit')} · faltam{' '}
            <strong>{xpParaLevelUp}</strong> para o nível {level + 1}
          </p>
          <div
            className="game-xp-section__hero-bar mt-2"
            role="progressbar"
            aria-valuenow={xpInLevel}
            aria-valuemin={0}
            aria-valuemax={xpToNext}
            aria-label={`XP ${xpInLevel} de ${xpToNext}`}
          >
            {/* Largura já vem animada via JS (displayPct, mesma fonte do
                anel) — sem transition CSS aqui, senão o preenchimento fica
                "chicoteando" atrás dos frames do RAF em vez de acompanhar. */}
            <div className="game-xp-section__hero-bar-fill" style={{ width: `${displayPct}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StreakBadge
              streak={stats.streak_atual}
              frozen={!!stats.streak_frozen_notice}
              securedToday={stats.sequencia_garantida_hoje ?? stats.treino_hoje}
            />
            <StreakCountdown
              sequenciaGarantida={stats.sequencia_garantida_hoje ?? stats.treino_hoje}
              streak={stats.streak_atual}
              frozenCount={stats.frozen_streak_count}
              frozenAutoUse={user?.preferencias?.frozen_streak_auto_usar ?? true}
            />
          </div>
        </div>
      </header>
    </section>
  );
}
