import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useState } from 'react';
import type { AfkEnemyId, PersonagemGenero } from '@/types';
import { collectSlimeAccessories, resolvePortraitAppearance } from '@/types';
import { SlimeBody } from '@/components/afk/SlimeBody';

export type AfkDialoguePortrait =
  | { kind: 'hero'; gender: PersonagemGenero }
  | { kind: 'boss'; enemyId: AfkEnemyId };

export interface AfkDialogueLine {
  speaker: string;
  text: string;
  tone?: 'elder' | 'hero' | 'slime' | 'story';
  portrait?: AfkDialoguePortrait;
}

function DialoguePortrait({ portrait }: { portrait: AfkDialoguePortrait | undefined }) {
  if (!portrait) return <MessageCircle size={24} aria-hidden />;
  if (portrait.kind === 'hero') {
    return (
      <img
        src={
          portrait.gender === 'feminino'
            ? '/assets/patrol-mascot-female-village.png'
            : '/assets/patrol-mascot-village.png'
        }
        alt=""
      />
    );
  }
  const appearance = resolvePortraitAppearance(portrait.enemyId);
  return (
    <SlimeBody
      enemyId={portrait.enemyId}
      isBoss
      appearance={appearance}
      accessories={collectSlimeAccessories(portrait.enemyId, true, appearance)}
      looting={false}
      portrait
    />
  );
}

interface Props {
  open: boolean;
  title: string;
  lines: readonly AfkDialogueLine[];
  onComplete: () => void;
  onDismiss?: () => void;
}

export function AfkDialogueModal({ open, title, lines, onComplete, onDismiss }: Props) {
  const [index, setIndex] = useState(0);
  const line = lines[index] ?? lines[0];

  if (!open || !line) return null;

  const finish = () => {
    setIndex(0);
    onComplete();
  };
  const next = () => {
    if (index >= lines.length - 1) finish();
    else setIndex((value) => value + 1);
  };

  return (
    <div className="game-afk-dialogue" role="dialog" aria-modal="true" aria-label={title}>
      <div className="game-afk-dialogue__shade" aria-hidden />
      {onDismiss ? (
        <button
          type="button"
          className="game-afk-dialogue__close"
          onClick={() => {
            setIndex(0);
            onDismiss();
          }}
          aria-label="Fechar diálogo"
        >
          <X size={18} />
        </button>
      ) : null}
      <motion.div
        className="game-afk-dialogue__panel"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div
          className={`game-afk-dialogue__portrait game-afk-dialogue__portrait--${line.tone ?? 'story'}${line.portrait?.kind === 'boss' ? ` game-afk-enemy--${line.portrait.enemyId}` : ''}`}
        >
          <DialoguePortrait portrait={line.portrait} />
        </div>
        <div className="game-afk-dialogue__copy">
          <span className="game-afk-dialogue__title">{title}</span>
          <strong>{line.speaker}</strong>
          <AnimatePresence mode="wait">
            <motion.p
              key={`${index}-${line.text}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              {line.text}
            </motion.p>
          </AnimatePresence>
        </div>
        <button type="button" className="game-afk-dialogue__next" onClick={next}>
          {index >= lines.length - 1 ? 'Continuar' : 'Próximo'}
        </button>
        <span className="game-afk-dialogue__progress tabular-nums">
          {index + 1}/{lines.length}
        </span>
      </motion.div>
    </div>
  );
}
