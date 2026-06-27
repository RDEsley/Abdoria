import { useEffect, useState } from 'react';
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
      <span className="game-rank-countdown__label">Próximo reset</span>
      <span className="game-rank-countdown__values tabular-nums">
        <span>{parts.days}d</span>
        <span>{parts.hours}h</span>
        <span>{parts.minutes}m</span>
      </span>
    </div>
  );
}
