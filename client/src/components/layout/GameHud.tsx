import { Flame, Zap } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { XpBar } from '@/components/ui/XpBar';

export function GameHud() {
  const { stats } = useApp();
  const { user } = useAuth();

  const level = stats ? Math.floor(stats.nivel_xp / 100) + 1 : 1;
  const xpInLevel = stats ? stats.nivel_xp % 100 : 0;
  const firstName = user?.nome?.split(' ')[0] ?? 'Atleta';

  return (
    <div className="game-hud">
      <div className="game-hud__avatar" aria-hidden>
        {firstName[0]?.toUpperCase()}
      </div>
      <div className="game-hud__info">
        <div className="game-hud__row">
          <span className="game-hud__name">{firstName}</span>
          <span className="game-hud__level">
            <Zap size={12} /> Nv.{level}
          </span>
        </div>
        <XpBar value={xpInLevel} max={100} showValues={false} variant="xp" />
        {stats && (
          <div className="game-hud__stats">
            <span className="game-hud__chip">
              <Flame size={12} /> {stats.streak_atual}d
            </span>
            <span className="game-hud__chip game-hud__chip--gold">
              XP {stats.xp_hoje}/{stats.xp_diario_limite}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
