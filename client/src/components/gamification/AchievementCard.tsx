import { Link } from 'react-router-dom';
import type { Achievement } from '@/types';
import {
  ACHIEVEMENT_DIFFICULTY_LABELS,
  formatAchievementPlayerPct,
} from '@/types';
import { AchievementBadge } from '@/components/gamification/AchievementBadge';

interface Props {
  achievement: Achievement;
  compact?: boolean;
}

export function AchievementCard({ achievement, compact = false }: Props) {
  const { desbloqueada, dificuldade, icon, titulo, descricao, pct_jogadores } = achievement;

  return (
    <div
      title={`${descricao} · ${formatAchievementPlayerPct(pct_jogadores)} dos jogadores`}
      className={`game-achievement game-achievement--${dificuldade} ${desbloqueada ? 'game-achievement--unlocked' : 'game-achievement--locked'} ${compact ? 'game-achievement--compact' : 'game-achievement--full'}`}
    >
      <AchievementBadge icon={icon} unlocked={desbloqueada} size={compact ? 18 : 22} />
      <div className="game-achievement__body">
        <span className="game-achievement__title">{titulo}</span>
        {!compact && <span className="game-achievement__desc">{descricao}</span>}
        <span className="game-achievement__meta">
          {ACHIEVEMENT_DIFFICULTY_LABELS[dificuldade]} · {formatAchievementPlayerPct(pct_jogadores)} dos jogadores
        </span>
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
      <Link to="/conquistas" className="game-link-btn mt-3 inline-flex">
        Ver todas as conquistas →
      </Link>
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

export function sortAchievements(conquistas: Achievement[]): Achievement[] {
  return [...conquistas].sort((a, b) => {
    if (a.desbloqueada !== b.desbloqueada) return a.desbloqueada ? -1 : 1;
    const order = { facil: 0, media: 1, dificil: 2, lendaria: 3 } as const;
    const diff = order[a.dificuldade] - order[b.dificuldade];
    if (diff !== 0) return diff;
    return b.pct_jogadores - a.pct_jogadores;
  });
}
