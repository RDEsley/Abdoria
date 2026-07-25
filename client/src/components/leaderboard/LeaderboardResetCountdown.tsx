import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { leaderboardResetCountdownParts } from '@shared/utils/timezone';

export function LeaderboardResetCountdown() {
  const [parts, setParts] = useState(() => leaderboardResetCountdownParts());

  useEffect(() => {
    const tick = () => setParts(leaderboardResetCountdownParts());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="game-rank-countdown" role="status" aria-live="polite">
      <span className="game-rank-countdown__icon" aria-hidden>
        <Trophy size={16} />
      </span>
      <div className="game-rank-countdown__body">
        <span className="game-rank-countdown__label">Próximo reset</span>
        <div className="game-rank-countdown__values tabular-nums">
          <span className="game-rank-countdown__tile">
            <strong>{parts.days}</strong>
            <small>dias</small>
          </span>
          <span className="game-rank-countdown__tile">
            <strong>{parts.hours}</strong>
            <small>hrs</small>
          </span>
          <span className="game-rank-countdown__tile">
            <strong>{parts.minutes}</strong>
            <small>min</small>
          </span>
        </div>
      </div>
    </div>
  );
}
