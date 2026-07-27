import { useNavigate } from 'react-router-dom';
import type { Achievement } from '@/types';
import { AchievementBadge } from '@/components/gamification/AchievementBadge';
import { GameButton } from '@/components/ui/GameButton';

interface Props {
  achievement: Achievement;
  compact?: boolean;
}

export function AchievementCard({ achievement, compact = false }: Props) {
  const { desbloqueada, icon, titulo, descricao } = achievement;

  return (
    <div
      title={descricao}
      className={`game-achievement ${desbloqueada ? 'game-achievement--unlocked' : 'game-achievement--locked'} ${compact ? 'game-achievement--compact' : 'game-achievement--full'}`}
    >
      <AchievementBadge icon={icon} unlocked={desbloqueada} size={compact ? 18 : 22} />
      <div className="game-achievement__body">
        <span className="game-achievement__title">{titulo}</span>
        {!compact && <span className="game-achievement__desc">{descricao}</span>}
      </div>
    </div>
  );
}

interface PreviewProps {
  conquistas: Achievement[];
  unlockedCount: number;
  total: number;
}

export function AchievementsPreview({ conquistas, unlockedCount, total }: PreviewProps) {
  const navigate = useNavigate();
  const preview = pickAchievementPreview(conquistas, 4);

  return (
    <section className="glass-card p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h3 className="game-section-title mb-0">Conquistas</h3>
        <p className="text-xs font-bold text-stone-500">
          {unlockedCount}/{total} desbloqueadas
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {preview.map((c) => (
          <AchievementCard key={c.id} achievement={c} compact />
        ))}
      </div>
      <GameButton
        variant="secondary"
        size="sm"
        onClick={() => navigate('/conquistas')}
        className="mt-3 w-full"
      >
        Ver todas as conquistas
      </GameButton>
    </section>
  );
}

export function pickAchievementPreview(conquistas: Achievement[], limit: number): Achievement[] {
  const sorted = sortAchievements(conquistas);
  const unlocked = sorted.filter((c) => c.desbloqueada);
  const locked = sorted.filter((c) => !c.desbloqueada);
  const picked: Achievement[] = [];

  for (const item of unlocked.slice(0, limit - 1)) {
    picked.push(item);
  }
  for (const item of locked) {
    if (picked.length >= limit) break;
    if (!picked.some((p) => p.id === item.id)) picked.push(item);
  }

  return picked.slice(0, limit);
}

/** Lista única (sem seções por dificuldade): desbloqueadas primeiro, depois por
    % real ASC (as mais raras — menor % de jogadores — vêm primeiro). Vale
    tanto pra lista cheia quanto pro preview (pickAchievementPreview), que
    reusa esse sort — mostrar a conquista rara logo de cara é bem mais
    interessante do que a mais comum. */
export function sortAchievements(conquistas: Achievement[]): Achievement[] {
  return [...conquistas].sort((a, b) => {
    if (a.desbloqueada !== b.desbloqueada) return a.desbloqueada ? -1 : 1;
    return a.pct_jogadores - b.pct_jogadores;
  });
}
