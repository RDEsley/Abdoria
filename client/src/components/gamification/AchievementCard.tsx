import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight, LockKeyhole, Sparkles, Trophy } from 'lucide-react';
import type { Achievement } from '@/types';
import { AchievementBadge } from '@/components/gamification/AchievementBadge';
import { GameButton } from '@/components/ui/GameButton';

interface Props {
  achievement: Achievement;
  compact?: boolean;
  index?: number;
}

const DIFFICULTY_LABELS: Record<Achievement['dificuldade'], string> = {
  facil: 'Comum',
  media: 'Especial',
  dificil: 'Rara',
  lendaria: 'Lendária',
};

export function AchievementCard({ achievement, compact = false, index = 0 }: Props) {
  const { desbloqueada, icon, titulo, descricao, dificuldade, pct_jogadores } = achievement;
  const reduceMotion = Boolean(useReducedMotion());
  const style = {
    '--achievement-delay': `${Math.min(index, 6) * 90}ms`,
  } as CSSProperties;

  return (
    <motion.article
      title={descricao}
      aria-label={`${titulo}. ${desbloqueada ? 'Conquista desbloqueada' : 'Conquista bloqueada'}.`}
      className={`game-achievement game-achievement--${dificuldade} ${desbloqueada ? 'game-achievement--unlocked' : 'game-achievement--locked'} ${compact ? 'game-achievement--compact' : 'game-achievement--full'}`}
      style={style}
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 320,
        damping: 24,
        delay: Math.min(index, 10) * 0.045,
      }}
      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.008 }}
    >
      <span className="game-achievement__ambient" aria-hidden />
      {desbloqueada && (compact || index < 4) ? (
        <span className="game-achievement__shine" aria-hidden />
      ) : null}
      <div className="game-achievement__medal">
        <AchievementBadge icon={icon} unlocked={desbloqueada} size={compact ? 20 : 25} />
        <span className="game-achievement__medal-state" aria-hidden>
          {desbloqueada ? <Check size={10} strokeWidth={3} /> : <LockKeyhole size={9} />}
        </span>
      </div>
      <div className="game-achievement__body">
        <span className="game-achievement__title">{titulo}</span>
        {compact ? (
          <span className="game-achievement__compact-meta">
            <span className="game-achievement__rarity">{DIFFICULTY_LABELS[dificuldade]}</span>
            <span aria-hidden>•</span>
            <span>{desbloqueada ? 'Conquistada' : 'A conquistar'}</span>
          </span>
        ) : (
          <>
            <span className="game-achievement__desc">{descricao}</span>
            <span className="game-achievement__meta">
              <span className="game-achievement__rarity">{DIFFICULTY_LABELS[dificuldade]}</span>
              <span className="game-achievement__community">
                {desbloqueada ? (
                  <Sparkles size={12} aria-hidden />
                ) : (
                  <LockKeyhole size={11} aria-hidden />
                )}
                {Math.max(0, Math.min(100, pct_jogadores)).toLocaleString('pt-BR', {
                  maximumFractionDigits: 1,
                })}
                % dos jogadores
              </span>
            </span>
          </>
        )}
      </div>
      <span className="game-achievement__status" aria-hidden>
        {desbloqueada ? <Sparkles size={15} /> : <LockKeyhole size={14} />}
      </span>
    </motion.article>
  );
}

interface PreviewProps {
  conquistas: Achievement[];
  unlockedCount: number;
  total: number;
}

export function AchievementsPreview({ conquistas, unlockedCount, total }: PreviewProps) {
  const navigate = useNavigate();
  const reduceMotion = Boolean(useReducedMotion());
  const preview = pickAchievementPreview(conquistas, 4);
  const progress = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  return (
    <motion.section
      className="glass-card dashboard-surface dashboard-surface--achievements achievements-preview"
      aria-labelledby="achievements-preview-title"
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 230, damping: 24 }}
    >
      <div className="achievements-preview__header">
        <div className="achievements-preview__intro">
          <motion.span
            className="achievements-preview__trophy"
            aria-hidden
            animate={reduceMotion ? undefined : { rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.75, delay: 0.35 }}
          >
            <Trophy size={20} fill="currentColor" fillOpacity={0.22} />
          </motion.span>
          <div>
            <p className="achievements-preview__eyebrow">Sua coleção</p>
            <h3 id="achievements-preview-title" className="game-section-title mb-0">
              Conquistas
            </h3>
          </div>
        </div>
        <div className="achievements-preview__score" aria-label={`${progress}% concluído`}>
          <strong>{unlockedCount}</strong>
          <span>de {total}</span>
        </div>
      </div>

      <div
        className="achievements-preview__progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={unlockedCount}
        aria-label="Progresso das conquistas"
      >
        <motion.span
          initial={reduceMotion ? false : { width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </div>

      <div className="achievements-preview__list">
        {preview.map((c, index) => (
          <AchievementCard key={c.id} achievement={c} compact index={index} />
        ))}
      </div>
      <GameButton
        variant="secondary"
        size="sm"
        onClick={() => navigate('/conquistas')}
        className="achievements-preview__button"
      >
        <span>Explorar todas as conquistas</span>
        <ChevronRight size={16} aria-hidden />
      </GameButton>
    </motion.section>
  );
}

/** As desbloqueadas do preview são sempre as MAIS RECENTES (não as mais
    raras) — o jogador quer ver o que acabou de conquistar, não uma vitrine
    de raridade. `desbloqueada_ordem` maior = desbloqueada depois; ausente
    (conquista de antes desse rastreio existir) fica por último. */
export function pickAchievementPreview(conquistas: Achievement[], limit: number): Achievement[] {
  const unlocked = conquistas
    .filter((c) => c.desbloqueada)
    .sort((a, b) => (b.desbloqueada_ordem ?? -1) - (a.desbloqueada_ordem ?? -1));
  const locked = sortAchievements(conquistas).filter((c) => !c.desbloqueada);
  const picked: Achievement[] = [];

  for (const item of unlocked.slice(0, limit)) {
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
